import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import * as chains from "wagmi/chains";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Landing from "./page/Landing";
import Applayout from "./page/Applayout";

import { citreaTestnet } from "./utils/CitreaTestnet";
import Home from "./page/Home";
import Feature from "./page/Feature";
import About from "./page/About";
import Working from "./page/Working";
import Treasure from "./page/Treasure";
import CreateInvoice from "./components/CreateInvoice";
import SentInvoice from "./page/SentInvoice";
import ReceivedInvoice from "./page/ReceivedInvoice";

const AllChains = [...Object.values(chains)];
// citreaTestnet,
export const config = getDefaultConfig({
  appName: "My RainbowKit App",
  projectId: "YOUR_PROJECT_ID",
  chains: AllChains,
  ssr: true,
});
const queryClient = new QueryClient();
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <div className="bg-[#161920]">
      <Toaster position="top-right" />
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            coolMode
            // initialChain={citreaTestnet}
            theme={darkTheme({
              accentColor: "#22c55e",
              accentColorForeground: "white",
              borderRadius: "medium",
              fontStack: "system",
              overlayBlur: "small",
            })}
          >
            <div className="font-Montserrat h-screen">
              <Router>
                <Routes>
                  <Route path="/" element={<Applayout />}>
                    <Route index element={<Landing />} />
                    <Route path="home" element={<Home />}>
                      <Route path="create" element={<CreateInvoice />} />
                      <Route path="sent" element={<SentInvoice />} />
                      <Route path="pending" element={<ReceivedInvoice />} />
                    </Route>
                    <Route path="feature" element={<Feature />} />
                    <Route path="about" element={<About />} />
                    <Route path="working" element={<Working />} />
                    <Route path="treasure" element={<Treasure />} />
                  </Route>
                </Routes>
              </Router>
            </div>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </div>
  );
}

export default App;
