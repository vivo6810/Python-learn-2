---
title: Sending Email and Text Messages
---

Email is two protocols. SMTP sends mail; IMAP reads it. Python speaks both, so a script can send a nightly report or clear out a folder of notifications without opening a mail client.

The two directions are independent. Sending needs an account that can relay; reading needs an account that stores. Most providers offer both, but the settings are different and the passwords often are too.

## Sending with SMTP

An SMTP server accepts a message for delivery. `smtplib` connects, authenticates, and hands over the text. Modern servers want TLS on port 587, so the sequence is: connect, `ehlo`, `starttls`, `ehlo` again, login, send.

```python
import smtplib
from email.message import EmailMessage

message = EmailMessage()
message["Subject"] = "Backup finished"
message["From"] = "me@example.com"
message["To"] = "me@example.com"
message.set_content("The archive was written to /backups/2026-11-21.zip.")

with smtplib.SMTP("smtp.example.com", 587) as server:
    server.ehlo()
    server.starttls()
    server.ehlo()
    server.login("me@example.com", password)
    server.send_message(message)
```

Each step exists for a reason. `ehlo` greets the server and asks what it supports. `starttls` upgrades the plain connection to an encrypted one. The second `ehlo` is necessary because the capabilities change after encryption. `login` authenticates. Only then can a message be sent.

Port 465 is a different mode: TLS from the first byte, handled by `smtplib.SMTP_SSL` with no `starttls()` call. If a provider documents "SSL" rather than "TLS", that is the one to use.

```python
with smtplib.SMTP_SSL("smtp.example.com", 465) as server:
    server.login("me@example.com", password)
    server.send_message(message)
```

`send_message` reads the headers and does the right thing. `sendmail(from, to, raw_text)` is the older form and expects a complete message with headers, so the `EmailMessage` version is the one to reach for.

Several recipients go in one header, comma-separated, and `send_message` handles them:

```python
message["To"] = "ada@example.com, grace@example.com"
message["Cc"] = "team@example.com"
```

The envelope recipients come from `To`, `Cc`, and `Bcc`. A `Bcc` address is removed from the header before transmission, which is exactly what blind copying means. Do not put someone in `Bcc` and then also in `To`.

Failures are exceptions, and each one means something different. `SMTPAuthenticationError` is a wrong password or an app password the provider revoked. `SMTPRecipientsRefused` is a bad address. `SMTPServerDisconnected` usually means the connection was idle too long or the TLS step was skipped. Catch them at the boundary of the script and print the message; a traceback at 3am in a log is fine, a silent failure is not.

## Passwords

Most providers refuse your normal password and require an app password, created in the account's security settings and revocable on its own. Never paste one into a script that lives in version control. Read it from the environment:

```python
import os

password = os.environ["SMTP_PASSWORD"]
```

Run the script with the variable set (`SMTP_PASSWORD=... python3 report.py`), or keep it in a file the script reads and `.gitignore` covers. If a token ever lands in a commit, rotate it — deleting the line later does not remove it from history.

`os.environ["SMTP_PASSWORD"]` raises `KeyError` when the variable is missing, which is the behaviour you want: fail before connecting. `os.environ.get("SMTP_PASSWORD")` returns `None` and pushes the failure to the login call, where the error message is less obvious.

## Richer messages

`EmailMessage` grows parts. `add_alternative` supplies an HTML version for clients that show it, and `add_attachment` carries a file. The order matters: plain text first, then HTML as the alternative.

```python
message.set_content("The report is attached.")
message.add_alternative("<h2>Report</h2><p>All checks passed.</p>", subtype="html")

with open("report.pdf", "rb") as attachment:
    data = attachment.read()

message.add_attachment(
    data,
    maintype="application",
    subtype="pdf",
    filename="report.pdf",
)
```

A message with an attachment can take a moment; the connection stays open while it uploads, which is why keeping the send inside a short-lived `with` block is tidy.

Attachments need a `maintype` and `subtype` that match the file. `image/png` for screenshots, `text/csv` for data, `application/zip` for archives. A wrong type does not stop delivery, but it can make the attachment open in the wrong program or be blocked by a mail filter.

Images can be embedded in the HTML body rather than attached, by giving the part a content id and referring to it with `cid:` in the markup. That is a nice touch for a chart in a report, and a reliable way to have the image stripped by a client that blocks remote content.

Building the HTML as a string is easiest with a small template:

```python
rows = "\n".join(f"<tr><td>{name}</td><td>{value}</td></tr>" for name, value in totals)

html = f"""
<h2>Daily totals</h2>
<table border="1" cellpadding="6">
{rows}
</table>
"""

message.add_alternative(html, subtype="html")
```

Do not interpolate untrusted text into HTML without escaping it; `html.escape()` is one call and prevents a broken table at best and an injection at worst.

## Reading mail with IMAP

`imapclient` wraps the awkward parts of IMAP: folders, search, fetch, and flags. `pyzmail6` turns a fetched message into readable parts.

```bash
pip install imapclient pyzmail6
```

```python
import imapclient

with imapclient.IMAPClient("imap.example.com", ssl=True) as server:
    server.login("me@example.com", password)
    server.select_folder("INBOX")

    messages = server.search(["UNSEEN"])
    print(len(messages), "unread")

    for uid, data in server.fetch(messages, ["BODY[]"]).items():
        raw = data[b"BODY[]"]
        print(len(raw), "bytes")
```

`select_folder` matters: searches run against the selected folder, and `INBOX` is not selected until you ask. Folder names are case-sensitive on some servers and not on others, so list them once with `server.list_folders()` and use the exact name.

Search keys read like a query language: `["FROM", "alerts@example.com", "SINCE", "01-Nov-2026"]`, `["SUBJECT", "invoice"]`, `["UNSEEN"]`. Multiple keys are combined with AND; `"OR"` takes two conditions. Dates in IMAP searches are always `DD-Mon-YYYY`, regardless of your locale.

```python
recent = server.search(["SINCE", "01-Nov-2026", "NOT", "DELETED"])
from_boss = server.search(["FROM", "boss@example.com", "SUBJECT", "report"])
```

`search` returns UIDs, small integers that are stable for the life of the mailbox. Use them, not sequence numbers, which shift when messages are deleted. `fetch` returns a dictionary keyed by UID.

Fetching headers only is much cheaper than fetching whole messages; `["BODY.PEEK[]"]` reads the body without marking the message as seen, which matters when you are indexing rather than reading.

Deleting is a flag plus an expunge, and `server.add_flags(uids, [imapclient.DELETED])` is reversible until you expunge:

```python
uids = server.search(["FROM", "notifications@example.com", "BEFORE", "01-Oct-2026"])
server.add_flags(uids, [imapclient.DELETED])
print("marked", len(uids))
# server.expunge()   # only when you are sure
```

Without `expunge()`, the messages sit in the folder flagged for deletion and most clients hide them. That pause is a safety net; use it until you trust the search.

Moving to another folder is a copy plus a delete, or a single `move` where the server supports it. Neither is undoable, so print the subjects before acting.

## Parsing the body

Parsing separates cleanly from the protocol:

```python
import pyzmail

message = pyzmail.PyzMessage.factory(raw)
print(message.get_subject())
print(message.get_addresses("from"))

if message.text_part:
    print(message.text_part.get_payload().decode(message.text_part.charset))
```

`get_addresses("from")` returns a list of `(name, address)` tuples, which is easier to filter than the raw header. A message may have an HTML part and no text part, or several alternatives; check both and fall back to the subject when neither is present.

The charset can be `None` on malformed mail. `message.text_part.get_payload().decode(message.text_part.charset or "utf-8", errors="replace")` never crashes, at the cost of a few replacement characters.

## Text messages

SMS needs a gateway, because phones do not run mail servers. Twilio's API is a few lines and a paid account:

```python
from twilio.rest import Client

client = Client(account_sid, auth_token)
client.messages.create(
    body="Backup finished.",
    from_="+15550001111",
    to="+15550002222",
)
```

Keep the SID and token in the environment for the same reason as the SMTP password. The `from_` number must be one you have bought or verified in the console; a trial account can only message numbers you have verified, and messages arrive with a trial prefix.

Long messages are split into segments and billed per segment. Anything beyond a short alert belongs in email. Rate limits are real, so a loop that sends to a hundred numbers needs a pause between calls and a retry with backoff on `429`.

Free email-to-SMS gateways also exist — an address like `number@carrier-gateway.com` that forwards mail as a text — but carriers retire them without notice, and delivery is unreliable. A paid API is the reliable route.

## Searching a mailbox

`IMAP` is a query language in front of a mailbox. Learning four of its operators turns "download everything and filter in Python" into one round trip.

```python
import imaplib

imap = imaplib.IMAP4_SSL("imap.example.com")
imap.login(user, password)
imap.select("INBOX", readonly=True)

status, data = imap.search(None, 'SUBJECT', '"invoice"', 'SINCE', '01-May-2024')
for number in data[0].split():
    status, message = imap.fetch(number, "(RFC822)")
```

The search arguments are concatenated, and each value that contains a space or a capital letter needs quoting. Useful operators: `FROM`, `TO`, `SUBJECT`, `BODY`, `TEXT` (headers and body), `SINCE`, `BEFORE`, `UNSEEN`, `FLAGGED`, `HAS Attachment` on some servers. `UNSEEN` alone answers "what is new" without a client-side filter.

`readonly=True` opens the mailbox with `EXAMINE` instead of `SELECT`, so searching does not mark anything as read. Without it, a careless fetch can clear the unread state of the whole mailbox, which is a surprising thing to do to someone.

Sequence numbers are positions in the mailbox and change when messages are deleted. `UID` values are stable, and `uid("SEARCH", ...)` / `uid("FETCH", ...)` is the version to prefer in any script that runs more than once:

```python
status, data = imap.uid("SEARCH", None, 'UNSEEN')
status, message = imap.uid("FETCH", data[0].split()[-1], "(RFC822)")
```

Flag changes are how you file a message: `imap.uid("STORE", uid, "+FLAGS", "\\Seen")` marks it read, `"-FLAGS"` removes a flag. `COPY` puts it in another folder; `MOVE` does both in one step on servers that support it. Deleted messages are only marked until `EXPUNGE` — a detail that saves you from deleting the wrong mail while testing.

Always log out in a `finally` block. Servers limit concurrent connections, and a script that crashes without `logout()` leaves a session open until it times out.

## Getting past the spam filter

A message sent from a script is judged like any other, and a correct one can still land in spam. The reasons are mostly about identity, not content.

Authentication comes first. Your domain needs an SPF record naming the sending server, DKIM signing so the message can be verified, and a DMARC policy saying what to do when either fails. These are DNS records you or an administrator set once. They are also why "send from my own laptop's SMTP" fails in ways no amount of subject-line tweaking fixes: a residential IP has no reputation and no authorisation to speak for the domain.

Practically, send through the provider that hosts the mailbox — Gmail's SMTP for a Gmail address, your host's SMTP for a domain you own — and use an app password rather than your login password.

Content rules that matter: send `multipart/alternative` with a plain-text part as well as HTML, set a real `From`, keep links to a small number of recognisable domains, and include a way to unsubscribe if the mail is bulk. A first message that is only an image, or a link shortener, reads exactly like the spam it resembles.

Volume is a signal too. A hundred messages in a minute from a new sender looks like a campaign. Space batches out, and never retry a hard bounce — a rejected address stays rejected.

```python
message["From"] = "Reports <reports@example.com>"
message["Reply-To"] = "team@example.com"
message["List-Unsubscribe"] = "<mailto:unsubscribe@example.com>"
```

Test with a seed list of real addresses across providers before a real send. Open rates are not a debugging tool; the spam folder is.

For anything beyond a personal script, a transactional email service exists precisely because this section is short and the reality is not. It handles authentication, reputation, bounces, and rate limits, and gives you an API instead of an SMTP conversation.

## A sendable template without the HTML guessing game

Most email code fails at the same stage: constructing the message object, not connecting. The
pattern that keeps you out of trouble is a tiny builder function with sensible MIME plumbing.

```python
import os
import smtplib
import ssl
from email.message import EmailMessage

def build_message(to, subject, body):
    message = EmailMessage()
    message["From"] = os.environ["REPORT_FROM"]
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    return message

def send(message):
    context = ssl.create_default_context()   # verifies the certificate and hostname
    with smtplib.SMTP("smtp.example.com", 587) as server:
        server.starttls(context=context)
        server.login(os.environ["SMTP_USER"], os.environ["SMTP_PASS"])
        server.send_message(message)
```

Three decisions are baked into that: the sender and credentials come from the environment, so the
file is safe to share; `starttls()` receives an explicit `ssl.create_default_context()`, because
the bare default trusts any certificate the server presents — the login password and every message
would otherwise be readable by whoever intercepts the connection — and it runs before `login()`, so
credentials travel encrypted over a verified channel; and `send_message` lets `EmailMessage` handle
the MIME headers, which is where hand-built strings usually break.

For HTML mail, call `add_alternative(html, subtype="html")` after `set_content` — the plain text
first, HTML second — and keep the HTML simple enough to read in a text editor. Never build HTML by
concatenating user data; escape it or, better, keep the mail plain text when the audience can
afford to read it. Attaching a file is one more method, `add_attachment(payload, maintype=...,
subtype=..., filename=...)`, with the bytes read from disk — not a path name.

Test by sending to yourself first, always. A typo in the recipient loop sends your report to a
mailbox that exists but is not yours, and there is no undo for that — one more reason the dry-run
habit from the automation chapters applies here too.

## Doubts worth settling

**Is sending mail the same as delivering it?** No. A successful `smtplib` call means a server
accepted the message. Delivery depends on the recipient's server, spam filters, and DNS records.
Check the `250` reply, keep the server's response, and do not promise anyone their mail arrived.

**Why do my messages land in spam?** Missing SPF, DKIM, and DMARC records, a mismatched From
address, a link-heavy body, and sending to strangers all contribute. Send through your provider's
SMTP with a verified From, keep content plain, and never buy a list.

**What is the difference between `To`, `Cc`, and `Bcc`?** Everyone sees `To` and `Cc`; nobody sees
`Bcc`. That makes `Bcc` the correct way to mail a group, and the wrong way to hide who else got it
while replying to the visible list.

**Why does the body look like one long paragraph?** Because plain text ignores newlines unless the
client is generous. Use `\n` plus blank lines between paragraphs, or send `MIMEText(body, "html")`
with real markup — and always include a plain-text alternative for people and filters that want it.

**Why does IMAP search return messages that do not match?** Search runs on the server and its
syntax differs from desktop clients. Quote strings, use `SINCE 01-Mar-2026`, and treat the result as
candidates: fetch, then filter in Python where you control the rules.

**How should I store credentials?** Never in code. Read them from environment variables or a keyring
and keep the file out of version control. For Gmail and similar providers, an app password is
needed when two-factor authentication is on, and a token should be revocable.

## A slow read of one script

```python
import os, smtplib
from email.message import EmailMessage

message = EmailMessage()
message["From"] = os.environ["MAIL_FROM"]
message["To"] = "ana@example.com"
message["Subject"] = "Weekly report"
message.set_content("Three orders are waiting for review.\n")
message.add_attachment(b"id,total\n1,42\n", maintype="text",
                       subtype="csv", filename="orders.csv")

with smtplib.SMTP(os.environ["SMTP_HOST"], 587) as server:
    server.starttls()
    server.login(os.environ["SMTP_USER"], os.environ["SMTP_PASS"])
    server.send_message(message)
```

`EmailMessage` builds a well-formed message, headers included, so nothing has to be assembled by
hand. Credentials come from the environment, which keeps them out of the repository. `starttls`
encrypts before the password is sent — never log in over plain SMTP. The `with` block closes the
connection cleanly even when sending fails. An attachment is bytes plus a filename; the CSV text is
encoded for you, and the recipient gets a real file rather than a pasted table.

## Practice questions

- What do `starttls()` and `login()` each do, and why does `ehlo()` appear twice?
- Why is a password read from an environment variable safer than one written in the script?
- Which method adds an HTML body, and in what order relative to `set_content`?
- What is the difference between flagging a message `DELETED` and expunging it?
- Why does an IMAP search date look like `01-Nov-2026` rather than `2026-11-01`?
- Write a script that emails you the ten newest unread subjects from a folder.
- Delete every message older than a month after printing its subject.
- Rewrite a hand-built MIME string as an `EmailMessage` with `set_content` and `add_alternative`, and note what got simpler.
- Send yourself a report email with an attachment built by `add_attachment`, read via bytes from disk.
