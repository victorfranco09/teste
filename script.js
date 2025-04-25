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

// Elementos
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

// LOGIN
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

// CARREGAR PENDÊNCIAS
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

// CARREGAR DETALHES
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

// CARREGAR PARTES
function carregarPartes(partes) {
  detPartesList.innerHTML = "";
  partes.forEach((parte, index) => {
    const li = document.createElement("li");
    li.textContent = parte.nome || parte;
    li.addEventListener("click", () => abrirModalParte(index));
    detPartesList.appendChild(li);
  });
}

// CARREGAR ANDAMENTOS
function carregarAndamentos(andamentos) {
  andamentosList.innerHTML = "";
  andamentos.forEach(and => {
    const div = document.createElement("div");
    div.className = "andamento-item";
    div.innerHTML = `
      <p>${and.texto}</p>
      <small>${new Date(and.data).toLocaleString()} - ${and.autor}</small>
    `;
    andamentosList.appendChild(div);
  });
}

// ABRIR MODAL DE PARTE
function abrirModalParte(index) {
  const parte = currentPartes[index];

  // Preencher os campos do modal
  document.getElementById("parte-status").value = parte.status || "vivo";
  document.getElementById("parte-interesse").value = parte.interesse || "não";
  document.getElementById("parte-lp").value = parte.lp || "não";

  const additionalFields = document.getElementById("additional-fields");
  additionalFields.innerHTML = "";

  if (parte.status === "falecido") {
    if (!parte.herdeiros) {
      parte.herdeiros = [{ nome: "", assinou: "não" }];
    }

    parte.herdeiros.forEach(herdeiro => {
      adicionarLinhaHerdeiro(herdeiro.nome, herdeiro.assinou);
    });

    adicionarLinhaHerdeiro("", "não"); // Linha vazia adicional
  }

  modal.classList.remove("hidden");

  salvarParteBtn.onclick = async () => {
    parte.status = document.getElementById("parte-status").value;
    parte.interesse = document.getElementById("parte-interesse").value;
    parte.lp = document.getElementById("parte-lp").value;

    if (parte.status === "falecido") {
      const herdeiros = [];
      document.querySelectorAll(".herdeiro-row").forEach(row => {
        const nome = row.querySelector(".herdeiro-name").value.trim();
        const assinou = row.querySelector(".herdeiro-assinou").value;
        if (nome) {
          herdeiros.push({ nome, assinou });
        }
      });
      parte.herdeiros = herdeiros;
    }

    currentPartes[index] = parte;
    await db.collection("pendencias").doc(currentDocId).update({ partes: currentPartes });
    modal.classList.add("hidden");
    carregarDetalhes(currentDocId);
  };
}

// FUNÇÃO ADICIONAR LINHA DE HERDEIRO
function adicionarLinhaHerdeiro(nome = "", assinou = "não") {
  const container = document.getElementById("additional-fields");
  const row = document.createElement("div");
  row.className = "herdeiro-row";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "herdeiro-name";
  input.placeholder = "Nome do Herdeiro";
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

// SALVAR ALTERAÇÕES DO DETALHES PRINCIPAL
salvarBtn.addEventListener("click", async () => {
  if (!currentDocId) return;
  const status = document.getElementById("det-status").value;
  const comentarios = document.getElementById("det-comentarios").value.trim();
  await db.collection("pendencias").doc(currentDocId).update({ status, comentarios });
  salvarMsg.textContent = "Alterações salvas!";
  carregarPendencias();
});

// ENVIAR NOVO ANDAMENTO
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

// FECHAR MODAL
modalClose.addEventListener("click", () => modal.classList.add("hidden"));
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
});