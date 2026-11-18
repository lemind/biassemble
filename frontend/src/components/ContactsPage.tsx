const EMAIL = 'grounnel@gmail.com';
const X_HANDLE = 'Lemind';

export default function ContactsPage() {
  return (
    <article className="mx-auto max-w-[40rem] px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Contacts</h1>
      <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 text-lg">
        <dt className="text-base-content/50">Email</dt>
        <dd>
          <a className="link" href={`mailto:${EMAIL}`}>
            {EMAIL}
          </a>
        </dd>
        <dt className="text-base-content/50">X (Twitter)</dt>
        <dd>
          <a className="link" href={`https://x.com/${X_HANDLE}`} rel="noopener">
            @{X_HANDLE}
          </a>
        </dd>
      </dl>
    </article>
  );
}
