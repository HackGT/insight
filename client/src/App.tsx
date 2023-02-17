import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { setPersistence, getAuth, inMemoryPersistence } from "firebase/auth";
import { useLogin, LoadingScreen, AuthProvider, Footer } from "@hex-labs/core";
import { ChakraProvider } from '@chakra-ui/react'

import "./App.css";
import "./bulma-tooltip.min.css";
import AdminHome from "./components/admin/AdminHome";
import Navigation from "./components/layout/Navigation";
import EmployerManager from "./components/employer/EmployerManager";

export const app = initializeApp({
  apiKey: "AIzaSyCsukUZtMkI5FD_etGfefO4Sr7fHkZM7Rg",
  authDomain: "auth.hexlabs.org",
});

setPersistence(getAuth(app), inMemoryPersistence);
axios.defaults.withCredentials = true;

function App() {
  // const [socket, setSocket] = useState<Socket | null>(null);

  // useEffect(() => {
  //   const authorizeWebsocket = async () => {
  //     const newSocket = io({
  //       withCredentials: true,
  //       path: "/socket",
  //     });
  //     setSocket(newSocket);
  //   };

  //   authorizeWebsocket();
  // }, [setSocket]);


  const [loading, loggedIn] = useLogin(app);

  if (loading) {
    return <LoadingScreen />;
  }


  if (!loggedIn) {
    window.location.href = `https://login.hexlabs.org?redirect=${window.location.href}`;
    return <LoadingScreen />;
  }

  const userData = null
  return (
    <ChakraProvider>
      <AuthProvider app={app}>
        {/* <SocketContext.Provider value={socket}> */}
        <Navigation user={userData} />
        <div className="container is-dark">
          <Routes>
            {/* <Route path="/participant" element={<ParticipantHome user={data} />} /> */}
            <Route path="/" element={<EmployerManager user={userData} />} />
            <Route path="/admin" element={<AdminHome user={userData} />} />
          </Routes>
        </div>
        <Footer />
        {/* </SocketContext.Provider> */}
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
