import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import App from './App.jsx';
import { config, getAuthority } from './config.js';
import './styles.css';

const authority = getAuthority();

const root = ReactDOM.createRoot(document.getElementById('root'));

if (!authority || !config.cognitoClientId) {
  root.render(
    <React.StrictMode>
      <div className="setup-screen">
        <section className="setup-panel">
          <h1>Easy CRM</h1>
          <p>Cognito runtime configuration is missing. Set the VITE_COGNITO_* values for local development or deploy with CDK to generate /config.js.</p>
        </section>
      </div>
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <AuthProvider
        authority={authority}
        client_id={config.cognitoClientId}
        redirect_uri={config.redirectUri}
        response_type="code"
        scope="openid email profile"
        automaticSilentRenew
        onSigninCallback={() => window.history.replaceState({}, document.title, window.location.pathname)}
      >
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
}
