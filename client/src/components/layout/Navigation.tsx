import React from "react";

import Header from "./Header";

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
  new Page("Participant Home", "/participant", user => user.type === "participant" || user.admin),
  new Page("Employer Home", "/employer", user => user.type === "employer" || user.admin),
  new Page("Admin", "/admin", user => user.admin),
  new Page("Log Out", "/logout", () => true),
];

interface Props {
  user: any;
}

const Navigation: React.FC<Props> = props => {
  const filteredRoutes = routes.filter((page: Page) => page.isAllowed(props.user));

  return <Header routes={filteredRoutes} />;
};

export default Navigation;
