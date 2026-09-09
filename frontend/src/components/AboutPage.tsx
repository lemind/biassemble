import { siblingBrand, type Brand } from '../lib/brand';
import WorkedExample from './grounnel/WorkedExample';

const STEPS = [
  { title: 'Text', line: 'An article, a post, an essay — anything written.' },
  { title: 'Claims', line: 'Statements of fact are extracted. Opinions are left alone.' },
  { title: 'Evidence', line: 'Each claim is searched on the open web.' },
  { title: 'Sources', line: 'Pages are fetched and ranked. Only useful passages are kept.' },
  { title: 'Verdicts', line: 'Every claim gets a verdict, the passage behind it, and a link.' },
];

export default function AboutPage({ brand }: { brand: Brand }) {
  const sibling = siblingBrand(brand);
  const grounnel = brand.id === 'grounnel' ? brand : sibling;
  const biassemble = brand.id === 'grounnel' ? sibling : brand;

  return (
    <article className="mx-auto max-w-[40rem] px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-base-content/50">Claim checking</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Grounnel</h1>
      <p className="mt-5 text-lg leading-relaxed text-base-content/80">
        Paste a piece of writing. Grounnel finds the factual claims, checks each one against the
        open web, and marks them in your text — verdict, passage, and source. It is a reading tool,
        not a truth score.
      </p>

      <h2 className="mt-14 text-sm uppercase tracking-widest text-base-content/50">How it works</h2>
      {/* Horizontal on desktop, stacked on mobile. The number is the only numeral — no "1. 1".
          Breaks out of the 40rem measure on wide screens: five columns inside it wrapped every
          step's one line onto four. */}
      <ol className="mt-5 grid gap-5 sm:-mx-16 sm:grid-cols-5 sm:gap-6">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <div className="font-mono text-xs text-base-content/40">{i + 1}</div>
            <div className="mt-1 font-medium">{step.title}</div>
            <p className="mt-1 text-sm leading-snug text-base-content/70">{step.line}</p>
          </li>
        ))}
      </ol>

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

      <h2 className="mt-14 text-sm uppercase tracking-widest text-base-content/50">Related</h2>
      <p className="mt-4 leading-relaxed text-base-content/80">
        <a className="link font-medium" href={biassemble.origin} rel="noopener">
          {biassemble.name}
        </a>{' '}
        looks for cognitive biases in text. It is a separate project at its own address. The two do
        not share a pipeline. Running both on the same document is planned; nothing about that has
        shipped.
      </p>

      <div className="mt-14">
        <WorkedExample />
      </div>

      <nav className="mt-14 border-t border-base-300 pt-6 text-sm">
        <a className="link" href={grounnel.id === brand.id ? '/' : grounnel.origin}>
          Check a text
        </a>
        <span className="px-2 text-base-content/30">·</span>
        <a className="link" href="/stats">
          What we have measured
        </a>
      </nav>
    </article>
  );
}
