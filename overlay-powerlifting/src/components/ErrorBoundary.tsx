'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public static getDerivedStateFromError(_: Error): State {
    // Mettez à jour l'état pour que le prochain rendu affiche l'UI de remplacement.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Vous pouvez également enregistrer l'erreur dans un service de reporting
    console.error("Uncaught error in overlay:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // Vous pouvez rendre n'importe quelle UI de remplacement
      return (
        <div className="fixed bottom-4 left-4 bg-red-800 text-white p-4 rounded-lg shadow-lg">
          <h2 className="font-bold text-lg">Erreur de l&apos;Overlay</h2>
          <p className="text-sm">Impossible d&apos;afficher les données de l&apos;athlète. Veuillez vérifier les logs.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;