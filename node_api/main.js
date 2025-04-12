import express from "express";
import { configDotenv } from "dotenv"
configDotenv()

const app = express();
const port = 3000;
const nome = process.env.nome

app.get("/ola", (req, res) => {
	res.send(`Olá ${nome} !`);
});

app.get("/dia", (req, res) => {
	res.send(`Bom Dia ${nome} !`);
});

app.get("/tarde", (req, res) => {
	res.send(`Boa Tarde ${nome} !`);
});

app.get("/noite", (req, res) => {
	res.send(`Boa Noite ${nome} !`);
});

app.listen(port, () => {
	console.log(`API rodando em http://localhost:${port}`);
});
