import React from "react";
import { Redirect } from "react-router-dom";

import PreEmployerHome from "./preemployer/PreEmployerHome";
import EmployerHome from "./dashboard/EmployerHome";

interface Props {
  user: any;
}

const EmployerManager: React.FC<Props> = props => {
  if (props.user.type !== "employer" && !props.user.admin) {
    return <Redirect to="/" />;
  }

  if (props.user.company && props.user.company?.verified) {
    return <EmployerHome user={props.user} />;
  }

  return <PreEmployerHome user={props.user} />;
};

export default EmployerManager;
