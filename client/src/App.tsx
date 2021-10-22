import React, { useEffect, useState } from "react";
import useAxios from "axios-hooks";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { io, Socket } from "socket.io-client";

import "./App.css";
import "./bulma-tooltip.min.css";
import AdminHome from "./components/admin/AdminHome";
import ParticipantHome from "./components/participant/ParticipantHome";
import Footer from "./components/layout/Footer";
import Navigation from "./components/layout/Navigation";
import EmployerManager from "./components/employer/EmployerManager";
import { SocketContext } from "./context/socket";

function App() {
  const [{ data, loading, error }] = useAxios("/auth/check");
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const authorizeWebsocket = async () => {
      const newSocket = io({
        withCredentials: true,
        path: "/socket",
      });
      setSocket(newSocket);
    };

    authorizeWebsocket();
  }, [setSocket]);

  if (loading) {
    return <div>Loading</div>;
  }

  if (error) {
    return <div>Error</div>;
  }

  return (
    <SocketContext.Provider value={socket}>
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
    </SocketContext.Provider>
  );
}

export default App;
