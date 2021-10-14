import React from "react";
import useAxios from "axios-hooks";

import logo from "./logo.svg";
import "./App.css";
import "./bulma-tooltip.min.css";
import AdminHome from "./admin/AdminHome";

import PreEmployerHome from "./preemployer/PreEmployerHome";
import ParticipantHome from "./participant/ParticipantHome";

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
        <ParticipantHome user={data} />
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
