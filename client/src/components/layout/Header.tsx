/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { Page } from "./Navigation";

interface Props {
  routes: Page[];
}

const Header: React.FC<Props> = props => {
  const location = `/${useLocation()?.pathname.split("/")[1]}`;
  const [burgerDropdownActive, setBurgerDropdownActive] = useState(false);

  return (
    <nav className="navbar is-info">
      <div className="container">
        <div className="navbar-brand">
          <div className="navbar-item">
            <div className="container">
              <h1 className="title" style={{ color: "#fff" }}>
                Insight
              </h1>
              <h2 className="subtitle" style={{ color: "#fff" }}>
                Sponsorship System
              </h2>
            </div>
          </div>
          <span
            className={`navbar-burger ${burgerDropdownActive && "is-active"}`}
            data-target="navbarMenu"
            style={{ height: "auto" }}
            onClick={() => setBurgerDropdownActive(prevState => !prevState)}
          >
            <span />
            <span />
            <span />
          </span>
        </div>
        <div id="navbarMenu" className={`navbar-menu ${burgerDropdownActive && "is-active"}`}>
          <div className="navbar-end">
            {props.routes.map(route => (
              <Link
                to={route.link}
                className={location === route.link ? `navbar-item is-active` : `navbar-item`}
              >
                {route.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
