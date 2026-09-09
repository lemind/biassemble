import { siblingBrand, type Brand } from '../lib/brand';

const PIPELINE = [
  { label: 'Your text', detail: 'Paste an article, a post, an essay — anything written.' },
  { label: 'Claims', detail: 'The statements of fact are pulled out. Opinions are left alone.' },
  { label: 'Evidence', detail: 'Each claim is searched for on the open web.' },
  { label: 'Ranked sources', detail: 'Pages are fetched and ranked; the useful passages are kept.' },
  { label: 'Verdicts', detail: 'Each claim gets a verdict, the passage behind it, and its source.' },
];

function Pipeline() {
  return (
    <ol className="grid gap-3 sm:grid-cols-5">
      {PIPELINE.map((step, i) => (
        <li key={step.label} className="rounded-lg border border-base-300 bg-base-100 p-3">
          <div className="text-xs font-mono text-base-content/50">{i + 1}</div>
          <div className="font-semibold">{step.label}</div>
          <p className="mt-1 text-sm text-base-content/70">{step.detail}</p>
        </li>
      ))}
    </ol>
  );
}

export default function AboutPage({ brand }: { brand: Brand }) {
  const sibling = siblingBrand(brand);
  const grounnel = brand.id === 'grounnel' ? brand : sibling;
  const biassemble = brand.id === 'grounnel' ? sibling : brand;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">About Grounnel</h1>

      <p className="mt-4 text-base-content/80">
        Grounnel reads a piece of writing, pulls out the statements of fact it makes, and checks each
        one against the open web. You get back your own text with every checked claim marked in
        place — what the evidence says, the passage it came from, and a link to where it was found.
        It is a tool for reading something carefully, not a truth score.
      </p>

      <h2 className="mt-10 text-xl font-semibold">How it works</h2>
      <div className="mt-4">
        <Pipeline />
      </div>

      <h2 className="mt-10 text-xl font-semibold">A false accusation is worse than a missed detection</h2>
      <p className="mt-4 text-base-content/80">
        This is the rule the whole system is built around. Calling something false when it is not
        does more damage than quietly failing to catch something that is — so when the evidence is
        weak, Grounnel says <em>not verified</em> rather than calling a claim false. Claims it
        declines to judge are marked as such and counted openly. A page of confident verdicts would
        be easier to read and worth much less.
      </p>

      <h2 className="mt-10 text-xl font-semibold">{biassemble.name}</h2>
      <p className="mt-4 text-base-content/80">
        {biassemble.name} is a separate project from the same work — it analyzes a text for cognitive
        biases rather than checking its facts, and it lives at{' '}
        <a className="link" href={biassemble.origin} rel="noopener">
          its own address
        </a>
        . The two are not connected today. Running both over the same text is a direction we mean to
        take, but nothing about it has shipped, and neither tool depends on the other.
      </p>

      <p className="mt-10 text-sm text-base-content/60">
        <a className="link" href={grounnel.id === brand.id ? '/' : grounnel.origin}>
          Check a text
        </a>{' '}
        ·{' '}
        <a className="link" href="/stats">
          What we have measured
        </a>
      </p>
    </div>
  );
}
