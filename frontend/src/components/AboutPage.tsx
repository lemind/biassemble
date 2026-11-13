import { useEffect } from 'react';
import { siblingBrand, type Brand } from '../lib/brand';
import WorkedExample from './grounnel/WorkedExample';

const GROUNNEL_STEPS = [
  { title: 'Text', line: 'An article, a post, an essay — anything written.' },
  {
    title: 'Claims',
    line: 'Statements of fact are extracted. Opinions, and other claims Grounnel declines to check, are left alone.',
  },
  { title: 'Evidence', line: 'Each claim is searched on the open web.' },
  { title: 'Sources', line: 'Pages are fetched and ranked. Only useful passages are kept.' },
  {
    title: 'Verdicts',
    line: 'Each checked claim gets a verdict, the passage behind it, and a source link.',
  },
];

const BIASSEMBLE_STEPS = [
  { title: 'Your situation', line: 'Write about something that happened, in your own words.' },
  { title: 'Questions', line: 'Answer a few questions about how you read it.' },
  { title: 'Reflection', line: 'Get back the cognitive biases that may be shaping your account.' },
];

function Steps({ steps, wide }: { steps: { title: string; line: string }[]; wide: boolean }) {
  // Breaks out of the 40rem measure, but only at lg: inside the measure five columns wrapped every
  // step's one line onto four, and the -mx-16 break-out overflows below ~1024px.
  const cols = wide ? 'lg:-mx-16 lg:grid-cols-5 lg:gap-6' : 'sm:grid-cols-3 sm:gap-6';
  return (
    <ol className={`mt-5 grid gap-5 ${cols}`}>
      {steps.map((step, i) => (
        <li key={step.title}>
          <div className="font-mono text-xs text-base-content/40">{i + 1}</div>
          <div className="mt-1 font-medium">{step.title}</div>
          <p className="mt-1 text-sm leading-snug text-base-content/70">{step.line}</p>
        </li>
      ))}
    </ol>
  );
}

// Spec 021: the public MCP address and the two client setups the release checks covered.
const MCP_URL = "https://mcp.grounnel.n30sk.cc/mcp";
const CLAUDE_CODE_SNIPPET = `claude mcp add --transport http grounnel ${MCP_URL} \\
  --header "X-Grounnel-Provider: qwen" \\
  --header "X-Grounnel-Provider-Key: YOUR_KEY"`;
const CURSOR_SNIPPET = `{
  "mcpServers": {
    "grounnel": {
      "url": "${MCP_URL}",
      "headers": {
        "X-Grounnel-Provider": "qwen",
        "X-Grounnel-Provider-Key": "YOUR_KEY"
      }
    }
  }
}`;

function Eyebrow({ children }: { children: string }) {
  return <p className="text-xs uppercase tracking-widest text-base-content/50">{children}</p>;
}

function Heading({ children, id }: { children: string; id?: string }) {
  return <h2 id={id} className="mt-14 scroll-mt-24 text-sm uppercase tracking-widest text-base-content/50">{children}</h2>;
}

// Each host gets its own About: on the Biassemble domain, a page about Grounnel would be a page
// about a different product. Short here on purpose — Biassemble is the smaller, older project.
function BiassembleAbout({ grounnel }: { grounnel: Brand }) {
  return (
    <>
      <Eyebrow>Cognitive bias</Eyebrow>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Biassemble</h1>
      <p className="mt-5 text-lg leading-relaxed text-base-content/80">
        Write about a situation you have been turning over. Biassemble asks you a few questions
        about it, then names the cognitive biases that may be shaping how you have told it. It is a
        prompt for thinking again, not a diagnosis.
      </p>

      <Heading>How it works</Heading>
      <Steps steps={BIASSEMBLE_STEPS} wide={false} />

      <Heading>Related</Heading>
      <p className="mt-4 leading-relaxed text-base-content/80">
        <a className="link font-medium" href={grounnel.origin} rel="noopener">
          Grounnel
        </a>{' '}
        checks the factual claims in a piece of writing against the open web. It is a separate
        project at its own address. The two do not share a pipeline.
      </p>
    </>
  );
}

function GrounnelAbout() {
  return (
    <>
      <Eyebrow>Claim checking</Eyebrow>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Grounnel</h1>
      <p className="mt-5 text-lg leading-relaxed text-base-content/80">
        Paste a piece of writing. Grounnel finds the factual claims, checks each one against the
        open web, and shows the result in your text — verdict, passage, and source. It is a reading
        tool, not a truth score.
      </p>

      <Heading>How it works</Heading>
      <Steps steps={GROUNNEL_STEPS} wide />

      <hr className="mt-14 border-base-300" />
      <p className="mt-6 text-xl italic leading-snug">
        A false accusation is worse than a missed detection.
      </p>
      <p className="mt-4 leading-relaxed text-base-content/80">
        Calling a true claim false does more harm than missing a lie. When the evidence is weak,
        Grounnel says <strong className="font-medium">not verified</strong> instead of calling the
        claim false. Claims it declines to judge are marked and counted. A page of confident
        verdicts would be easier to read. It would also be worth less.
      </p>

      <div className="mt-14">
        <WorkedExample />
      </div>

      <Heading id="own-key">Using your own key</Heading>
      <p className="mt-4 leading-relaxed text-base-content/80">
        Grounnel normally runs on our Google Gemini account. You can instead run a check on your own
        Gemini, DeepSeek, or Qwen key.
      </p>
      <p className="mt-4 leading-relaxed text-base-content/80">
        <strong className="font-medium">Safe by design.</strong> Your key is sent over HTTPS. A long
        check runs in several steps, so while it runs the key is held encrypted (AES-256) in temporary
        storage for at most 45 minutes, and deleted as soon as the check ends. It is never written to
        our database, and key-shaped text is stripped from any error we store.
      </p>
      <p className="mt-4 leading-relaxed text-base-content/80">
        <strong className="font-medium">You only pay for your part.</strong> The key pays the provider
        directly; Grounnel never bills through it or holds a balance on it. It covers reading the
        article and judging the claims. Web search runs on Grounnel&apos;s account, at no cost to you.
        After the check, Grounnel shows exactly how many input and output tokens it used.
      </p>
      <p className="mt-4 leading-relaxed text-base-content/80">
        <strong className="font-medium">You stay in control.</strong> Revoke the key anytime from your
        provider&apos;s console and this check can never touch it again — a key dedicated to Grounnel
        is the safest option. Note that the result&apos;s share link is public.
      </p>

      <Heading id="mcp">Use Grounnel from your assistant</Heading>
      <p className="mt-4 leading-relaxed text-base-content/80">
        Grounnel is also an MCP server, so an AI assistant can fact-check text for you and read back
        every claim with its verdict and sources. It runs on your own key only. Add this address once,
        with your provider (<code>gemini</code>, <code>deepseek</code> or <code>qwen</code>) and your
        key as two request headers:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-base-200 p-3 text-xs">{MCP_URL}</pre>
      <p className="mt-4 leading-relaxed text-base-content/80">
        <strong className="font-medium">Claude Code:</strong>
      </p>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-base-200 p-3 text-xs">{CLAUDE_CODE_SNIPPET}</pre>
      <p className="mt-4 leading-relaxed text-base-content/80">
        <strong className="font-medium">Cursor</strong>, in <code>~/.cursor/mcp.json</code>:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-base-200 p-3 text-xs">{CURSOR_SNIPPET}</pre>
      <p className="mt-4 leading-relaxed text-base-content/80">
        <strong className="font-medium">Claude (desktop and web):</strong> add a custom connector with
        this address, &quot;No sign-in&quot;, and the same two request headers. We haven&apos;t tested
        this one yet.
      </p>
      <p className="mt-4 leading-relaxed text-base-content/80">
        <strong className="font-medium">What happens to your text.</strong> It goes to your chosen
        provider for reading and judging, and to Grounnel&apos;s own Google and Tavily accounts for
        search. The result is published at a link anyone with it can open, so don&apos;t check anything
        private. Your key is handled as above: held encrypted only while a check runs. To count the
        hourly limit of 30 checks per key, Grounnel keeps a one-way fingerprint of the key for an hour.
      </p>
      <p className="mt-4 leading-relaxed text-base-content/80">
        <strong className="font-medium">Keep the key private.</strong> Put it in your personal
        settings, not in a config file you commit or share with a team.
      </p>

      <Heading>Related</Heading>
      <p className="mt-4 leading-relaxed text-base-content/80">
        Biassemble looks for cognitive biases in text. It is a separate project. The two do not
        share a pipeline. Running both on the same document is planned; nothing about that has
        shipped.
      </p>
    </>
  );
}

export default function AboutPage({ brand }: { brand: Brand }) {
  const sibling = siblingBrand(brand);
  // The page is lazy-loaded, so the browser's own jump to #section runs before the section exists.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);
  return (
    <article className="mx-auto max-w-[40rem] px-6 py-16">
      {brand.id === 'grounnel' ? (
        <GrounnelAbout />
      ) : (
        <BiassembleAbout grounnel={sibling} />
      )}
    </article>
  );
}
