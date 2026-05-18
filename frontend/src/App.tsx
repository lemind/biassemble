import { Suspense, lazy, useState } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingFallback from './components/common/LoadingFallback';

const StoryForm = lazy(() => import('./components/StoryForm'));

function App() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (storyText: string) => {
    console.log({ storyText });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">Thank You</h1>
            <p className="py-6 text-lg">
              Your story has been received. Full reflection flow coming soon!
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setSubmitted(false)}
            >
              Write another story
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content flex-col lg:flex-row-reverse gap-12">
          <div className="text-center lg:text-left max-w-lg">
            <h1 className="text-5xl font-bold">Biassemble</h1>
            <p className="py-6 text-lg text-base-content/80">
              Discover cognitive biases in your own reasoning. Write a personal situation,
              answer AI-guided questions, and get insights that help you see things differently.
            </p>
          </div>
          <div className="card bg-base-100 w-full max-w-md shrink-0 shadow-2xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-2">Share your story</h2>
              <Suspense fallback={<LoadingFallback />}>
                <StoryForm onSubmit={handleSubmit} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;