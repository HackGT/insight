/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Column } from "react-table";
import { Link as ChakraLink, Text } from "@chakra-ui/react";
import { DateTime } from "luxon";
import axios from "axios";
import { apiUrl, Service, useAuth, SearchableTable } from "@hex-labs/core";

import TableFilter from "../commonTable/TableFilter";
import { handleAddVisit, generateTag, tagButtonHandler } from "../commonTable/util";
import ParticipantModal from "../commonTable/ParticipantModal";
import Table from "../commonTable/Table";
import TableExport from "../commonTable/TableExport";
import useAxios from "axios-hooks";

interface Props {
  company: any;
  companyRefetch: any;
}

const ParticipantTable: React.FC<Props> = (props) => {
  // Table filtering states

  // const handleGetResume = async (userId: any) => {
  //   console.log("getting resume for")
  //   console.log(userId)
  //   const user = await axios.get(apiUrl(Service.USERS, `/users/${userId}`));
  //   console.log(user)
  //   console.log(user.data.resume)

  //   axios.get(apiUrl(Service.FILES, `/files/${user?.data?.resume?.id}/view`));

  // }
  const limit = 50;
  const columns = [
    {
      key: 0,
      header: "Name",
      accessor: (row: any) =>
      (
        <button
          className="button is-info is-outlined"
          style={{ marginBottom: "10px" }}
          onClick={() => {
            console.log("current user")
            console.log(row)
            setModalUser(row.id)
          }
          }
        >
          {row.name}
        </button>
      ),
    },
    {
      key: 1,
      header: "Email",
      accessor: (row: any) => row.email,
    },
    // {
    //   key: 2,
    //   header: "Resume",
    //   accessor: (row: any) => <button
    //     onClick={() => handleGetResume(row.userId)}
    //     // type="button"
    //     className="button is-info"
    //     // disabled={downloadDisabled}
    //   >
    //     <span className="icon is-small">
    //       <i className="fas fa-download" />
    //     </span>
    //     <span>Download Resume</span>
    //   </button>
    // }
  ];

  const [modalUser, setModalUser] = useState("")
  const [offset, setOffset] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [{ data, error }] = useAxios({
    method: "GET",
    url: apiUrl(Service.REGISTRATION, "/applications"),
    params: {
      hexathon: process.env.REACT_APP_HEXATHON_ID,
      status: "CONFIRMED",
      search: searchText,
      offset,
    },
  });

  const [{ data: visitData, error: visitError }] = useAxios({
    method: "GET",
    url: apiUrl(Service.HEXATHONS, `/sponsor-visit`),
    params: {
      hexathon: process.env.REACT_APP_HEXATHON_ID
    }
  });

  useEffect(() => {
    console.log(visitData)
  }, [visitData])


  const onPreviousClicked = () => {
    setOffset(offset - limit);
  };

  const onNextClicked = () => {
    setOffset(offset + limit);
  };

  const onSearchTextChange = (event: any) => {
    setSearchText(event.target.value);
    setOffset(0);
  };

  if (error || visitError) {
    return <div>Error</div>;
  }

  return (
    <>
      <SearchableTable
        title="Attendees"
        data={data?.applications}
        columns={columns}
        searchText={searchText}
        onSearchTextChange={onSearchTextChange}
        onPreviousClicked={onPreviousClicked}
        onNextClicked={onNextClicked}
        offset={offset}
        total={data?.total}
      />
      <ParticipantModal
        participantId={modalUser}
        // visitData={detailModalInfo?.visitData}
        setModalUser={setModalUser}
      // fetchData={fetchData}
      />
    </>

  );
};

export default ParticipantTable;
