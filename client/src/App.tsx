import React from "react";
import useAxios from "axios-hooks";

import "./App.css";
import "./bulma-tooltip.min.css";
import AdminHome from "./components/admin/AdminHome";
import PreEmployerHome from "./components/preemployer/PreEmployerHome";
import ParticipantHome from "./components/participant/ParticipantHome";
import EmployerHome from "./components/employer/EmployerHome";

function App() {
  const [{ data, loading, error }] = useAxios("/auth/check");

  if (loading) {
    return <div>Loading</div>;
  }

  if (error) {
    return <div>Error</div>;
  }

  return (
    <>
      <header className="hero is-info is-bold">
        <div className="hero-body">
          <div className="container">
            <h1 className="title">Insight</h1>
            <h2 className="subtitle">Sponsorship System</h2>
          </div>
        </div>
      </header>
      <div className="container is-dark">
        <EmployerHome />
      </div>
      <footer className="footer">
        <div className="content has-text-centered">
          <p>
            Made with{" "}
            <span className="icon">
              <i className="fas fa-heart" />
            </span>{" "}
            by HackGT.
          </p>
        </div>
      </footer>
    </>
  );
}

export default App;
