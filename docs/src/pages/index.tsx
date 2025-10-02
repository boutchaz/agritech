import React from 'react';
import Link from '@docusaurus/Link';

export default function Home(): JSX.Element {
  return (
    <main className="container margin-vert--lg">
      <div className="row">
        <div className="col col--7">
          <h1>Agritech Documentation</h1>
          <p>
            Centralized docs for the React frontend, FastAPI backend, database, and DevOps.
          </p>
          <ul>
            <li>
              <Link to="/">Guides & Architecture</Link>
            </li>
            <li>
              <Link to="/api">OpenAPI Reference</Link>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

