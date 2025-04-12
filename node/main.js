import express from "express";

const app = express();
const port = 3000;

app.get("/ola", (req, res) => {
	res.send("Olá Mundo!");
});

app.get("/dia", (req, res) => {
	res.send("Bom Dia Mundo!");
});

app.get("/tarde", (req, res) => {
	res.send("Boa Tarde Mundo!");
});

app.get("/noite", (req, res) => {
	res.send("Boa Noite Mundo!");
});

app.listen(port, () => {
	console.log(`API rodando em http://localhost:${port}`);
});
