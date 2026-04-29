const API_BASE = "/api";
const TOKEN_KEY = "agendapro-token";

const form = document.getElementById("signup-form");
const feedback = document.getElementById("signup-feedback");

form?.addEventListener("submit", handleSignup);

async function handleSignup(event) {
  event.preventDefault();
  const data = new FormData(form);

  try {
    const response = await request("/auth/signup", {
      method: "POST",
      body: {
        ownerName: String(data.get("ownerName") || "").trim(),
        salonName: String(data.get("salonName") || "").trim(),
        email: String(data.get("email") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        password: String(data.get("password") || ""),
        plan: String(data.get("plan") || "").trim(),
      },
    });

    localStorage.setItem(TOKEN_KEY, response.token);
    feedback.textContent = "Conta criada com sucesso. Redirecionando para o painel...";
    feedback.className = "feedback success";
    window.setTimeout(() => {
      window.location.href = "/estabelecimento";
    }, 800);
  } catch (error) {
    feedback.textContent = error.message || "Nao foi possivel criar a conta.";
    feedback.className = "feedback error";
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Falha na requisicao.");
  return data;
}
