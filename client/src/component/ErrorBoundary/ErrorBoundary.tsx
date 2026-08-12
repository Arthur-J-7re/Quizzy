import { Component, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
}

// Filet de secours pour les crashs après montage (le script a bien chargé,
// mais un composant plante) : sans ça, React démonte tout et laisse une page
// blanche sans aucune indication de ce qui s'est passé.
export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    render() {
        if (this.state.error) {
            return (
                <div style={{ fontFamily: "monospace", padding: 16, color: "#b00", whiteSpace: "pre-wrap" }}>
                    Erreur au montage :
                    {"\n"}
                    {this.state.error.message}
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
