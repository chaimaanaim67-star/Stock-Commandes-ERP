import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-8">
          <div className="max-w-xl bg-white rounded-[32px] border border-[#E8E2DC] p-10 shadow-2xl text-center">
            <h1 className="text-3xl font-black text-[#4B3621] mb-4">Une erreur est survenue</h1>
            <p className="text-sm text-gray-600 mb-6">
              Veuillez actualiser la page ou revenir plus tard. Si le problème persiste, contactez l'administrateur.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-[#9DC183] text-[#4B3621] font-black uppercase px-6 py-3 rounded-2xl shadow hover:opacity-90"
            >
              Actualiser
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
