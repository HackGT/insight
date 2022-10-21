/* eslint-disable no-nested-ternary */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-underscore-dangle */
import axios from "axios";
import React, { useEffect, useState } from "react";
import { apiUrl, Service, useAuth } from "@hex-labs/core";
import {
  Box,
  Heading,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  VStack,
  Stack,
  Link,
  HStack,
  Tag,
  TagLabel,
  TagRightIcon,
  useToast,
} from "@chakra-ui/react";

import PDFContainer from "./PDFContainer";
import { handleAddVisit, generateTag, tagButtonHandler, handleDeleteVisit } from "./util";
import useAxios from "axios-hooks";
import { formatName } from "../../../../util";

interface Props {
  companyHasAccess: boolean
  participantId: string;
  // visitData: any;
  setModalUser: React.Dispatch<any>;
  // fetchData: () => void;
}

// const updatedVisit = data.visits.find((visit: any) => visit._id === detailModalInfo._id);
const ParticipantModal: React.FC<Props> = props => {

  const [link, setLink] = useState({
    url: "",
    withCredentials: false,
  });
  const downloadDisabled = link.url === "";

  const [{ data, loading, error }, userRefetch] = useAxios({
    method: "GET",
    url: apiUrl(Service.REGISTRATION, `/applications/${props.participantId}`)
  });


  useEffect(() => {
    console.log("got the weirdData")
    console.log(data)
    console.log("got the weirdData")
  }, [data])

  if (props.participantId === "" || loading || error) {
    console.log("was null")
    return null
  }
  console.log(props.participantId)


  // useEffect(() => {
  //   // Get a time-limited public link to the resume for use with Google / Microsoft viewer
  //   const options: RequestInit = {
  //     method: "GET",
  //     credentials: "include",
  //   };

  //   async function getResumeLink() {
  //     if (!props.participant?.resume) return;

  //     try {
  //       const response = await fetch(`/${props.participant.resume?.path}?public=true`, options);
  //       const json = await response.json();

  //       if (!json.success) {
  //         alert(json.error);
  //       }

  //       // setLink(`localhost:3000/uploads/${json.link}&download=true`);
  //       // setResumeDownloadLink(`http://localhost:3000/uploads/${json.link}&download=true`);

  //       setLink({
  //         url: `${new URL(window.location.href).origin}/uploads/${json.link}&download=true`,
  //         withCredentials: true,
  //       });

  //       // if (props.participant.resume.path.toLowerCase().indexOf(".doc") !== -1) {
  //       //   // Special viewer for Word documents
  //       //   this.resume.src = `${link}`;
  //       // } else {
  //       //   // Google Drive Viewer supports a bunch of formats including PDFs, Pages, images
  //       //   this.resume.src = `${link}`;
  //       // }
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   }

  //   getResumeLink();
  // }, [props, props.participant]);

  // const handleAddNote = async () => {
  //   const note = (prompt("New note:") || "").trim();
  //   if (!note) return;

  //   await axios.put(
  //     apiUrl(Service.HEXATHONS, `/sponsor-visit/${props.visitData.id}`),
  //     {
  //       notes: [...props.visitData.notes, note]
  //     }
  //   );

  //   props.fetchData();
  // };

  // const handleDeleteNote = async (note: any) => {
  //   if (!window.confirm("Are you sure that you want to delete this note?")) return;

  //   await axios.put(
  //     apiUrl(Service.HEXATHONS, `/sponsor-visit/${props.visitData.id}`),
  //     {
  //       notes: props.visitData.notes.filter((n: any) => n != note)
  //     }
  //   );

  //   props.fetchData();
  // };

  // if (props.participant == null) {
  //   return null;
  // }

  return (
    props.participantId !== "" ? (
      <article className="modal is-active">
        <div className="modal-backgrosund" />
        <div className="modal-card">
          <header className="modal-card-head">
            <div className="modal-title">
              <h1 className="title" id="detail-name">
                {data.name}
              </h1>
              
            </div>
            <button
              className="delete"
              aria-label="close"
              onClick={() => props.setModalUser("")}
            />
          </header>
          <section className="modal-card-body">
            <div className="columns">
              <div className="column">
                <Box paddingX="30px" paddingTop="20px">

                  <Accordion defaultIndex={[0, 1, 2, 3]} allowMultiple>
                    <AccordionItem>
                      <h2>
                        <AccordionButton>
                          <Box flex="1" textAlign="left">
                            <Text style={{ fontWeight: "bold" }}>Contact Information</Text>
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                      </h2>
                      <AccordionPanel pb={3}>
                        <Stack>
                          <Text>
                            <Text color="gray" fontSize="sm">
                              Email
                            </Text>
                            {data.email}
                          </Text>
                          <Text>
                            <Text color="gray" fontSize="sm">
                              Phone Number
                            </Text>
                            {data.applicationData.phoneNumber}
                          </Text>
                          <Text>
                            <Text color="gray" fontSize="sm">
                              School Email
                            </Text>
                            {data.applicationData.schoolEmail}
                          </Text>
                        </Stack>
                      </AccordionPanel>
                    </AccordionItem>

                    <AccordionItem>
                      <h2>
                        <AccordionButton>
                          <Box flex="1" textAlign="left">
                            <Text style={{ fontWeight: "bold" }}>General Information</Text>
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                      </h2>
                      <AccordionPanel pb={4}>
                        <Stack>
                          <Text>
                            <Text color="gray" fontSize="sm">
                              University
                            </Text>
                            {data.applicationData.school}
                          </Text>
                          <Text>
                            <Text color="gray" fontSize="sm">
                              School Year
                            </Text>
                            {data.applicationData.schoolYear}
                          </Text>
                          <Text>
                            <Text color="gray" fontSize="sm">
                              Major
                            </Text>
                            {data.applicationData.major}
                          </Text>
                          
                          <Text>
                            <Text color="gray" fontSize="sm">
                              Identifies as
                            </Text>
                            {data.applicationData.gender}
                          </Text>
                          <Text>
                            <Text color="gray" fontSize="sm">
                              Ethnicity
                            </Text>
                            {data.applicationData.ethnicity}
                          </Text>
                         
                         
                        </Stack>
                      </AccordionPanel>
                    </AccordionItem>

                    {/* <AccordionItem>
                      <h2>
                        <AccordionButton>
                          <Box flex="1" textAlign="left">
                            <Text style={{ fontWeight: "bold" }}>Application Questions</Text>
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                      </h2>
                      <AccordionPanel pb={4}>
                        <Stack>
                          {data.applicationData.essays.map((essay: any) => (
                            <Text key={essay.id}>
                              <Text color="gray" fontSize="sm">
                                {essay.criteria}
                              </Text>
                              {essay.answer}
                            </Text>
                          ))}
                        </Stack>
                      </AccordionPanel>
                    </AccordionItem> */}
                  </Accordion>
                </Box>
              </div>
            </div>
          </section>
          <footer className="modal-card-foot">
            <div className="buttons">
              {/* <Link
                    href={apiUrl(Service.FILES, `/files/${data.applicationData.resume?.id}/view`)}
                    target="_blank"
                    color="teal.500"
                  > */}
              {data.applicationData.resume?.id && props.companyHasAccess? (
                <button
                  onClick={() => {
                    window.open(apiUrl(Service.FILES, `/files/${data.applicationData.resume?.id}/view`), '_blank')?.focus();
                  }}
                  type="button"
                  className="button is-info"
                  disabled={false}
                >
                  <span className="icon is-small">
                    <i className="fas fa-download" />
                  </span>
                  <span>Download Resume</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="button is-info"
                  disabled
                >
                  <span className="icon is-small">
                    <i className="fas fa-download" />
                  </span>
                  <span>Download Resume</span>
                </button>
              )}

              {/* {props.visitData ? (
              <button
                className="button is-danger"
                onClick={() => handleDeleteVisit(props.visitData, props.fetchData)}
              >
                <span className="icon is-small">
                  <i className="fas fa-trash-alt" />
                </span>
                <span>Delete visit</span>
              </button>
            ) : (
              <button
                className="button is-info"
                onClick={() => handleAddVisit(props.participant, props.fetchData)}
              >
                <span className="icon is-small">
                  <i className="fas fa-plus" />
                </span>
                <span>Add to visits</span>
              </button>
            )} */}
              <span className="spacer" />
              {/* {props.visitData && (
              <>
                <button
                  className="button is-warning"
                  onClick={() => tagButtonHandler(props.visitData, "starred", props.fetchData)}
                >
                  <span className="icon is-small">
                    <i className="fas fa-star" />
                  </span>
                  <span>Star</span>
                </button>
                <button
                  className="button is-success"
                  onClick={() => tagButtonHandler(props.visitData, "flagged", props.fetchData)}
                >
                  <span className="icon is-small">
                    <i className="fas fa-flag" />
                  </span>
                  <span>Flag</span>
                </button>
                <button
                  className="button is-info"
                  onClick={() => tagButtonHandler(props.visitData, "", props.fetchData)}
                >
                  <span className="icon is-small">
                    <i className="fas fa-plus" />
                  </span>
                  <span>Add tag</span>
                </button>
                <button className="button is-dark" onClick={() => handleAddNote()}>
                  <span className="icon is-small">
                    <i className="fas fa-plus" />
                  </span>
                  <span>Add note</span>
                </button>
              </>
            )} */}

              <span className="spacer" />
              <button
                className="button"
                id="detail-close"
                onClick={() => props.setModalUser("")}
              >
                Close
              </button>
            </div>
          </footer>
        </div>
      </article>
    ) : null)
};

export default ParticipantModal;
