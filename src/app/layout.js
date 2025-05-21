import '../styles/globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NotificationProvider from '../../components/NotificationProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NotificationProvider>
          {children}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            closeOnClick
            pauseOnHover
            draggable
          />
        </NotificationProvider>
      </body>
    </html>
  );
}