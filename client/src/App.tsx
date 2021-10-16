import React from "react";
import useAxios from "axios-hooks";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import "./App.css";
import "./bulma-tooltip.min.css";
import AdminHome from "./components/admin/AdminHome";
import PreEmployerHome from "./components/preemployer/PreEmployerHome";
import ParticipantHome from "./components/participant/ParticipantHome";
import EmployerHome from "./components/employer/EmployerHome";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Navigation from "./components/layout/Navigation";

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
          <Route exact path="/employer" component={EmployerHome} />
          <Route exact path="/admin" component={AdminHome} />
        </Switch>
      </div>
      <Footer />
    </Router>
  );
}

export default App;
