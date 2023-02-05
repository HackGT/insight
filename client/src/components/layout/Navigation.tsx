import React from "react";

import {Header, HeaderItem} from "@hex-labs/core"
import { Link } from "react-router-dom";

export class Page {
  name: string;
  link: string;
  isAllowed: (user: any) => boolean;

  constructor(name: string, link: string, isAllowed: (user: any) => boolean) {
    this.name = name;
    this.link = link;
    this.isAllowed = isAllowed;
  }
}

export const routes = [
  // new Page("Participant Home", "/participant", user => user.type === "participant" || user.admin),
  new Page("Home", "/", user => user.type === "employer" || user.admin),
  new Page("Admin", "/admin", user => user.admin),
];

interface Props {
  user: any;
}

const Navigation: React.FC<Props> = props => {
  const hi = "";
  // const filteredRoutes = routes.filter((page: Page) => page.isAllowed(props.user));

  return (
    <Header>
      (
        <>
        <Link to="/">
            <HeaderItem>Home</HeaderItem>
          </Link>
          <Link to="/admin">
            <HeaderItem>Admin</HeaderItem>
          </Link>
        </>
      )
    </Header>
  );
};

export default Navigation;