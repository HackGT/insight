import React from "react";
import { Navigate } from "react-router-dom";
import { apiUrl, Service, useAuth } from "@hex-labs/core";
import useAxios from "axios-hooks";

import PreEmployerHome from "./preemployer/PreEmployerHome";
import EmployerHome from "./dashboard/EmployerHome";

interface Props {
  user: any;
}

const EmployerManager: React.FC<Props> = props => {
  const { user } = useAuth()
  const [{ data: companyData, loading: companyLoading, error: companyError }, companyRefetch] = useAxios({
    method: "GET",
    url: apiUrl(Service.USERS, `/companies/employees/${user?.uid}`)
  });

  const [{data: userData, loading: userLoading, error: userError}, userRefetch] = useAxios({
    method: "GET",
    url: apiUrl(Service.USERS, `/users/${user?.uid}`)
  });


  if (companyLoading || userLoading) {
    return <div>Loading</div>;
  }

  if (companyError || userError) {
    return <div>Error</div>;
  }

  if (companyData) {
    return <EmployerHome company={companyData} user={userData} companyRefetch={companyRefetch} />;
  } else {
    return <PreEmployerHome user={userData} userRefetch={userRefetch}/>;
  }

};

export default EmployerManager;
