import React, { useEffect, useState } from "react";
import useAxios from "axios-hooks";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { setPersistence, getAuth, inMemoryPersistence } from "firebase/auth";
import { useLogin, LoadingScreen, AuthProvider, useAuth } from "@hex-labs/core";

import "./App.css";
import "./bulma-tooltip.min.css";
import AdminHome from "./components/admin/AdminHome";
import ParticipantHome from "./components/participant/ParticipantHome";
import Footer from "./components/layout/Footer";
import Navigation from "./components/layout/Navigation";
import EmployerManager from "./components/employer/EmployerManager";
import { SocketContext } from "./context/socket";

export const app = initializeApp({
  apiKey: "AIzaSyCsukUZtMkI5FD_etGfefO4Sr7fHkZM7Rg",
  authDomain: "auth.hexlabs.org",
});

setPersistence(getAuth(app), inMemoryPersistence);
axios.defaults.withCredentials = true;

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const { user } = useAuth();
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

  const [loading, loggedIn] = useLogin(app);

  if (loading) {
    return <LoadingScreen />;
  }
  if (!loggedIn) {
    window.location.href = `https://login.hexlabs.org?redirect=${window.location.href}`;
    return <LoadingScreen />;
  }

  // if (loading) {
  //   return <div>Loading</div>;
  // }

  // if (error) {
  //   return <div>Error</div>;
  // }

  const data = null;

  return (
    <AuthProvider app={app}>
      <SocketContext.Provider value={socket}>
        <Navigation user={data} />
        <div className="container is-dark">
          <Routes>
            {/* <Route path="/participant" element={<ParticipantHome user={data} />} /> */}
            <Route path="/employer" element={<EmployerManager user={data} />} />
            <Route path="/admin" element={<AdminHome user={data} />} />
          </Routes>
        </div>
        <Footer />
      </SocketContext.Provider>
    </AuthProvider>
  );
}

export default App;
