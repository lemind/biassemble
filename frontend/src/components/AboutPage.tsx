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

function Eyebrow({ children }: { children: string }) {
  return <p className="text-xs uppercase tracking-widest text-base-content/50">{children}</p>;
}

function Heading({ children }: { children: string }) {
  return <h2 className="mt-14 text-sm uppercase tracking-widest text-base-content/50">{children}</h2>;
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

function GrounnelAbout({ biassemble }: { biassemble: Brand }) {
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

      <Heading>Related</Heading>
      <p className="mt-4 leading-relaxed text-base-content/80">
        <a className="link font-medium" href={biassemble.origin} rel="noopener">
          {biassemble.name}
        </a>{' '}
        looks for cognitive biases in text. It is a separate project at its own address. The two do
        not share a pipeline. Running both on the same document is planned; nothing about that has
        shipped.
      </p>
    </>
  );
}

export default function AboutPage({ brand }: { brand: Brand }) {
  const sibling = siblingBrand(brand);
  return (
    <article className="mx-auto max-w-[40rem] px-6 py-16">
      {brand.id === 'grounnel' ? (
        <GrounnelAbout biassemble={sibling} />
      ) : (
        <BiassembleAbout grounnel={sibling} />
      )}
    </article>
  );
}
