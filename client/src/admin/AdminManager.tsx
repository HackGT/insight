import axios from "axios";
import useAxios from "axios-hooks";
import React from "react";

import { formatName } from "../util";

const AdminManager: React.FC = () => {
  const [{ data, loading, error }, refetch] = useAxios("/api/adminInfo");

  if (loading) {
    return <div>Loading</div>;
  }

  if (error) {
    return <div>Error</div>;
  }

  const handleDeleteAdmin = async (user: any) => {
    if (!window.confirm("Are you sure you want to revoke admin privileges from this user?")) return;

    await axios.delete("/api/admin", { data: { email: user.email } });
    refetch();
  };

  const handleAddAdmin = async () => {
    let email = prompt("Email of new admin:");
    if (!email) return;

    email = email.trim().toLowerCase();
    await axios.post("/api/admin", { email });
    refetch();
  };

  return (
    <>
      <h1 className="title">Admins</h1>
      <h2 className="subtitle">The people who can access this page</h2>
      <section className="columns">
        <div className="column">
          <h1 className="title">Preconfigured</h1>
          <h2 className="subtitle">
            You can only change these in config.json or server environment variables
          </h2>
          <p>Email domains:</p>
          <ul>
            {data.adminDomains.length === 0 ? (
              <li>
                <em>None</em>
              </li>
            ) : (
              data.adminDomains.map((adminDomain: any) => (
                <li>
                  <span className="icon">
                    <i className="fas fa-at" />
                  </span>
                  <strong>{adminDomain}</strong>
                </li>
              ))
            )}
          </ul>
          <p>Specific emails:</p>
          <ul>
            {data.adminEmails.length === 0 ? (
              <li>
                <em>None</em>
              </li>
            ) : (
              data.adminEmails.map((adminEmail: any) => (
                <li>
                  <span className="icon">
                    <i className="fas fa-envelope" />
                  </span>
                  <strong>{adminEmail}</strong>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="column">
          <h1 className="title">Current</h1>
          <h2 className="subtitle">Active users with admin privileges</h2>
          <ul>
            {data.currentAdmins.map((currentAdmin: any) => (
              <li className="single-line-button">
                <span className="icon">
                  <i className="fas fa-user-cog" />
                </span>
                <strong>{formatName(currentAdmin.name)}</strong> ({currentAdmin.email})
                <button
                  className="button is-danger is-outlined delete-admin"
                  onClick={() => handleDeleteAdmin(currentAdmin)}
                >
                  Demote
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="column">
          <h1 className="title">New</h1>
          <h2 className="subtitle">Promote an existing user to gain admin privileges</h2>
          <button className="button is-primary is-outlined" onClick={() => handleAddAdmin()}>
            Promote New User
          </button>
        </div>
      </section>
    </>
  );
};

export default AdminManager;
