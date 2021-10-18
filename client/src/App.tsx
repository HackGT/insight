import React from "react";
import useAxios from "axios-hooks";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import "./App.css";
import "./bulma-tooltip.min.css";
import "./types/react-table-config.d";
import AdminHome from "./components/admin/AdminHome";
import ParticipantHome from "./components/participant/ParticipantHome";
import Footer from "./components/layout/Footer";
import Navigation from "./components/layout/Navigation";
import EmployerManager from "./components/employer/EmployerManager";

function App() {
  const [{ data, loading, error }] = useAxios("/auth/check");

  if (loading) {
    return <div>Loading</div>;
  }

  if (error) {
    return <div>Error</div>;
  }
  return (
    <Router>
      <Navigation user={data} />
      <div className="container is-dark">
        <Switch>
          <Route exact path="/participant" render={() => <ParticipantHome user={data} />} />
          <Route exact path="/employer" render={() => <EmployerManager user={data} />} />
          <Route exact path="/admin" render={() => <AdminHome user={data} />} />
        </Switch>
      </div>
      <Footer />
    </Router>
  );
}

export default App;
