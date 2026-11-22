import type { Metadata } from "next";
import { PythonRunner } from "@/components/PythonRunner";

export const metadata: Metadata = {
  title: "Playground",
  description: "Write Python in the browser and run it. Everything executes locally in your browser.",
};

const STARTER = `# Write your own Python here.
# Ctrl+Enter (or Cmd+Enter) runs. Nothing is sent anywhere —
# the interpreter is downloaded to your browser once, then cached.

for attempt in range(3):
    print("attempt", attempt + 1)
`;

export default function PlaygroundPage() {
  return (
    <div className="shell playground">
      <div className="intro">
        <p className="intro__kicker">Python</p>
        <h1 className="intro__title">Playground</h1>
      </div>
      <PythonRunner initialCode={STARTER} fileName="playground.py" />
    </div>
  );
}
