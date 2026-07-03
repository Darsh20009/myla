import { Layout } from "@/components/Layout";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { HeroCinematic } from "@/components/HeroCinematic";

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  return (
    <Layout hideFooter transparentNav>
      <div style={{ marginTop: "-5rem" }}>
        <HeroCinematic
          onShop={() => navigate("/products")}
          onLogin={() => navigate("/login")}
          isLoggedIn={!!user}
        />
      </div>
    </Layout>
  );
}
