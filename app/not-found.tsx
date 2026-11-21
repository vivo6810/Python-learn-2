import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell notfound">
      <h1 className="intro__title">Nothing here.</h1>
      <Link className="btn btn--ghost" href="/">
        <span>Home</span>
      </Link>
    </div>
  );
}
