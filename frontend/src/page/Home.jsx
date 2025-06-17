import * as React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PendingIcon from '@mui/icons-material/Pending';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import DraftsIcon from "@mui/icons-material/Drafts";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      text: "Sent Requests",
      icon: <MailOutlineIcon />,
      route: "sent",
      color: "#4ade80", // green-400
    },
    {
      text: "Received Requests",
      icon: <DraftsIcon />,
      route: "pending",
      color: "#60a5fa", // blue-400
    },
    {
      text: "New Invoice",
      icon: <AddCircleOutlineIcon />,
      route: "create",
      color: "#f472b6", // pink-400
    },
  ];
  return (
    <>
      <div className="md:px-44 ">
        <header className="my-6">
          <h1 className="text-xl text-white">
            Welcome <span className="font-medium text-green-400">Back !</span>
          </h1>
          {/* <p className="text-gray-400 mt-2">Manage your payment requests</p> */}
        </header>
        <Box sx={{ display: "flex" }}>
          <nav className="lg:w-64 flex-shrink-0 ">
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Drawer
                variant="permanent"
                sx={{
                  "& .MuiDrawer-paper": {
                    width: "100%",
                    border: "none",
                    backgroundColor: "transparent",
                    position: "relative",
                    height: "auto",
                  },
                }}
              >
                <List className="space-y-1">
                  {menuItems.map((item) => (
                    <ListItem
                      key={item.route}
                      disablePadding
                      className="mb-1 last:mb-0 text-white"
                    >
                      <ListItemButton
                        onClick={() => navigate(item.route)}
                        selected={location.pathname.includes(item.route)}
                        sx={{
                          borderRadius: "6px",
                          transition: "all 0.2s ease",
                          backgroundColor: location.pathname.includes(
                            item.route
                          )
                            ? "rgba(255, 255, 255, 0.05)"
                            : "transparent",
                          "&:hover": {
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                          },
                          "&.Mui-selected": {
                            borderLeft: `3px solid ${item.color}`,
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{ minWidth: "40px", color: item.color }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.text}
                          primaryTypographyProps={{
                            fontSize: "0.95rem",
                            fontWeight: location.pathname.includes(item.route)
                              ? 500
                              : 400,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Drawer>
            </Box>
          </nav>
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              maxHeight: "calc(80vh - 44px)",
              overflowY: "auto",
              marginLeft: "30px",
              paddingLeft: "20px",
              scrollbarWidth: "none",
              minHeight: "calc(100vh - 260px)",
              minWidth: "calc(100vw - 600px)",
              "@media (max-width: 768px)": {
                minWidth: "calc(100vw - 300px)",
              },
            
              
              transition: "all 0.3s ease",
            }}
            className="text-white border-l-2 border-l-gray-700"
          >
            <Outlet />
          </Box>
          {/* <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              maxHeight: "calc(80vh - 44px)",
              overflowY: "auto",
              marginLeft: "30px",
              paddingLeft: "20px",
              scrollbarWidth: "none",
              minHeight: "calc(100vh - 260px)",
              minWidth: "calc(100vw - 600px)",
              "@media (max-width: 768px)": {
                minWidth: "calc(100vw - 300px)",
              },
            }}
            className="bg-[#1b1f29] rounded-md shadow-2xl text-white p-2"
          >
            <Outlet />
          </Box> */}
        </Box>
      </div>
    </>
  );
}