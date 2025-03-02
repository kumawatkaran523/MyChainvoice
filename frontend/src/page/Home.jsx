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
import { Outlet, useNavigate } from 'react-router-dom';
export default function Home() {
  const navigate = useNavigate();

  const list = [
    {
      text: 'Create New Invoice Request',
      icon: <AddCircleIcon />,
      route: 'create'
    },
    {
      text: 'Pending Payment Requests',
      icon: <PendingIcon />,
      route: 'pending'
    },
    {
      text: 'Sent Payment Requests',
      icon: <MarkEmailReadIcon />,
      route: 'sent'
    }
  ]
  return (
    <>
      <p className='text-4xl font-bold my-10 text-white '>
        Welcome <span className='text-green-500'>Back!</span>
      </p>

      <Box sx={{ display: 'flex', }}>
        <Drawer
          variant="permanent"
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              backgroundColor: '#161920',
              color: 'white',
              top: '184px',
              left: '180px',
              borderRight: 'none',
              position: 'sticky',
              zIndex: 1,
            },
          }}
        >
          <Box
            sx={{
              overflow: 'auto',
              background: 'linear-gradient(145deg, #161920, #161920)',
              padding: '8px',
              borderRadius: '12px',
              boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.5)',
            }}
            className="shadow-2xl rounded-lg"
          >
            <List>
              {list.map((obj, index) => (
                <ListItem key={obj.text} disablePadding onClick={() => navigate(obj.route)}>
                  <ListItemButton
                    sx={{
                      borderRadius: '8px',
                      transition: '0.3s',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'white' }}>
                      {obj.icon}
                    </ListItemIcon>
                    <ListItemText primary={obj.text} sx={{ color: 'white' }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>
        <Box component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            maxHeight: 'calc(80vh - 44px)',
            overflowY: 'auto',
            marginLeft: '30px',
            paddingLeft: '20px',
            scrollbarWidth: 'none',
          }}
          className='bg-[#161920] rounded-md shadow-2xl text-white p-2'
        >
          <Outlet />
        </Box>
      </Box>
    </>
  );
}
