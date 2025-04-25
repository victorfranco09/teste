
// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAMT1wEM5zgWgazsKv8XnO0zzHp7UB4ov4",
  authDomain: "painel-pendencias.firebaseapp.com",
  projectId: "painel-pendencias",
  storageBucket: "painel-pendencias.firebasestorage.app",
  messagingSenderId: "969369108934",
  appId: "1:969369108934:web:88c5ac5a8acd987509f2c7"
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const loginBtn = document.getElementById("login-btn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const loginError = document.getElementById("login-error");

const pendenciasList = document.getElementById("pendencias-list");
const detalhesSection = document.getElementById("detalhes-section");
const salvarBtn = document.getElementById("salvar-btn");
const salvarMsg = document.getElementById("salvar-msg");

const novoAndamento = document.getElementById("novo-andamento");
const enviarAndamento = document.getElementById("enviar-andamento");
const andamentosList = document.getElementById("andamentos-list");
const detPartesList = document.getElementById("det-partes-list");

const modal = document.getElementById("modal");
const modalClose = document.querySelector(".close");
const parteDetailsContainer = document.getElementById("parte-details-container");
const salvarParteBtn = document.getElementById("salvar-parte-btn");

let currentDocId = null;
let currentPartes = [];

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) {
    loginError.textContent = "Preencha todos os campos.";
    return;
  }
  try {
    await auth.signInWithEmailAndPassword(email, password);
    loginScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
    carregarPendencias();
  } catch (err) {
    loginError.textContent = "Usuário ou senha inválidos.";
  }
});

async function carregarPendencias() {
  pendenciasList.innerHTML = "";
  const snapshot = await db.collection("pendencias").get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const li = document.createElement("li");
    li.textContent = data.processo;
    li.addEventListener("click", () => carregarDetalhes(doc.id));
    pendenciasList.appendChild(li);
  });
}

async function carregarDetalhes(docId) {
  const doc = await db.collection("pendencias").doc(docId).get();
  if (!doc.exists) return;
  const data = doc.data();
  currentDocId = docId;
  currentPartes = data.partes || [];

  detalhesSection.classList.remove("hidden");
  document.getElementById("det-processo-text").textContent = data.processo;
  document.getElementById("det-descricao-text").textContent = data.descricao;
  document.getElementById("det-data-inicial-text").textContent = new Date(data.data_inicial).toLocaleDateString();
  document.getElementById("det-prazo-text").textContent = new Date(data.prazo).toLocaleDateString();
  document.getElementById("det-status").value = data.status || "pendente";
  document.getElementById("det-comentarios-text").textContent = data.comentarios || "";
  document.getElementById("det-comentarios").value = data.comentarios || "";

  carregarPartes(currentPartes);
  carregarAndamentos(data.andamentos || []);
}

function carregarPartes(partes) {
  detPartesList.innerHTML = "";
  partes.forEach((parte, index) => {
    const li = document.createElement("li");
    li.textContent = parte.nome || parte;
    li.addEventListener("click", () => abrirModalParte(index));
    detPartesList.appendChild(li);
  });
}

function abrirModalParte(index) {
  const parte = currentPartes[index];
  parteDetailsContainer.innerHTML = "";

  const nomeLabel = document.createElement("h3");
  nomeLabel.textContent = parte.nome || "Parte";
  parteDetailsContainer.appendChild(nomeLabel);

  const statusLabel = document.createElement("label");
  statusLabel.textContent = "Status:";
  const statusSelect = document.createElement("select");
  ["vivo", "falecido"].forEach(opt => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
    statusSelect.appendChild(option);
  });
  statusSelect.value = parte.status || "vivo";
  parteDetailsContainer.appendChild(statusLabel);
  parteDetailsContainer.appendChild(statusSelect);

  const interesseLabel = document.createElement("label");
  interesseLabel.textContent = "Interesse:";
  const interesseSelect = document.createElement("select");
  ["sim", "não"].forEach(opt => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
    interesseSelect.appendChild(option);
  });
  interesseSelect.value = parte.interesse || "não";
  parteDetailsContainer.appendChild(interesseLabel);
  parteDetailsContainer.appendChild(interesseSelect);

  const lpLabel = document.createElement("label");
  lpLabel.textContent = "LP:";
  const lpSelect = document.createElement("select");
  ["sim", "não"].forEach(opt => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
    lpSelect.appendChild(option);
  });
  lpSelect.value = parte.lp || "não";
  parteDetailsContainer.appendChild(lpLabel);
  parteDetailsContainer.appendChild(lpSelect);

  const additionalContainer = document.createElement("div");
  parteDetailsContainer.appendChild(additionalContainer);

  function renderAdditionalFields() {
    additionalContainer.innerHTML = "";
    if (statusSelect.value === "falecido") {
      renderizarHerdeiros(parte, additionalContainer);
    }
  }

  statusSelect.addEventListener("change", renderAdditionalFields);
  renderAdditionalFields();

  salvarParteBtn.onclick = async () => {
    parte.status = statusSelect.value;
    parte.interesse = interesseSelect.value;
    parte.lp = lpSelect.value;

    if (parte.status === "falecido") {
      const herdeiros = [];
      additionalContainer.querySelectorAll(".herdeiro-row").forEach(row => {
        const nome = row.querySelector(".herdeiro-name").value.trim();
        const assinou = row.querySelector(".herdeiro-assinou").value;
        if (nome) herdeiros.push({ nome, assinou });
      });
      parte.herdeiros = herdeiros;
    }

    currentPartes[index] = parte;
    await db.collection("pendencias").doc(currentDocId).update({ partes: currentPartes });
    modal.classList.add("hidden");
    carregarDetalhes(currentDocId);
  };

  modal.classList.remove("hidden");
}

function renderizarHerdeiros(parte, container) {
  const herdeiros = parte.herdeiros || [{ nome: "", assinou: "não" }];
  herdeiros.forEach(h => adicionarLinhaHerdeiro(h.nome, h.assinou, container));
  adicionarLinhaHerdeiro("", "não", container);
}

function adicionarLinhaHerdeiro(nome = "", assinou = "não", container) {
  const row = document.createElement("div");
  row.className = "herdeiro-row";

  const input = document.createElement("input");
  input.className = "herdeiro-name";
  input.value = nome;

  const select = document.createElement("select");
  select.className = "herdeiro-assinou";
  ["sim", "não"].forEach(opt => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
    select.appendChild(option);
  });
  select.value = assinou;

  row.appendChild(input);
  row.appendChild(select);
  container.appendChild(row);
}

salvarBtn.addEventListener("click", async () => {
  if (!currentDocId) return;
  const status = document.getElementById("det-status").value;
  const comentarios = document.getElementById("det-comentarios").value.trim();
  await db.collection("pendencias").doc(currentDocId).update({ status, comentarios });
  salvarMsg.textContent = "Alterações salvas!";
  carregarPendencias();
});

enviarAndamento.addEventListener("click", async () => {
  if (!currentDocId || !novoAndamento.value.trim()) return;
  const texto = novoAndamento.value.trim();
  const dataAndamento = new Date().toISOString();
  const user = auth.currentUser.email;

  const docRef = db.collection("pendencias").doc(currentDocId);
  const docSnap = await docRef.get();
  const dados = docSnap.data();
  const novoArray = dados.andamentos || [];
  novoArray.push({ texto, autor: user, data: dataAndamento });

  await docRef.update({ andamentos: novoArray });
  novoAndamento.value = "";
  carregarDetalhes(currentDocId);
});

modalClose.addEventListener("click", () => modal.classList.add("hidden"));
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
});
