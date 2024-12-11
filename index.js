const express = require("express");
const { Client } = require("pg");
const cors = require("cors");
const bodyparser = require("body-parser");
const config = require("./config");
const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyparser.json());

var conString = config.urlConnection;
var client = new Client(conString);
client.connect((err) => {
  if (err) {
    return console.error("Não foi possível conectar ao banco.", err);
  }
  client.query("SELECT NOW()", (err, result) => {
    if (err) {
      return console.error("Erro ao executar a query.", err);
    }
    console.log("Conexão estabelecida com sucesso:", result.rows[0]);
  });
});



// LISTAR TODOS OS FILMES FAVORITADOS
app.get("/favoritos", (req, res) => {
  try {
    client.query("SELECT id, tmdb_id, titulo, caminho_poster, comentarios_usuario, data_criacao FROM Usuarios WHERE tmdb_id IS NOT NULL",
      (err, result) => {
        if (err) {
          console.error("Erro ao executar a query de SELECT favoritos", err);
          res.status(500).json({ error: "Erro ao buscar favoritos" });
        } else {
          res.send(result.rows);
          console.log("Rota: GET /favoritos");
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// BUSCAR UM FAVORITO ESPECÍFICO PELO ID
app.get("/favoritos/:id", (req, res) => {
  try {
    console.log("Rota: GET /favoritos/" + req.params.id);
    client.query(
      "SELECT id, tmdb_id, titulo, caminho_poster, comentarios_usuario, data_criacao FROM Usuarios WHERE id = $1 AND tmdb_id IS NOT NULL",
      [req.params.id],
      (err, result) => {
        if (err) {
          console.error("Erro ao executar SELECT de um favorito", err);
          res.status(500).json({ error: "Erro ao buscar o favorito" });
        } else {
          if (result.rows.length === 0) {
            res.status(404).json({ info: "Favorito não encontrado." });
          } else {
            res.send(result.rows[0]);
          }
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// ADICIONAR UM NOVO FAVORITO

app.post("/favoritos", (req, res) => {
  try {
    console.log("Rota: POST /favoritos com dados:", req.body);
    const { tmdb_id, titulo, caminho_poster, comentarios_usuario } = req.body;

    if (!tmdb_id || !titulo || !caminho_poster) {
      return res.status(400).json({ error: "Faltam campos obrigatórios." });
    }

    
    client.query(
      "INSERT INTO Usuarios (tmdb_id, titulo, caminho_poster, comentarios_usuario) VALUES ($1, $2, $3, $4) RETURNING id, tmdb_id, titulo, caminho_poster, comentarios_usuario, data_criacao",
      [tmdb_id, titulo, caminho_poster, comentarios_usuario || ""],
      (err, result) => {
        if (err) {
          console.error("Erro ao executar INSERT de favorito", err);
          res.status(500).json({ error: "Erro ao inserir favorito" });
        } else {
          const favorito = result.rows[0];
          res.status(201).json(favorito);
          console.log("Favorito inserido:", favorito);
        }
      }
    );
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// ATUALIZAR COMENTÁRIOS DE UM FAVORITO

app.put("/favoritos/:id", (req, res) => {
  try {
    console.log("Rota: PUT /favoritos/" + req.params.id, "Dados:", req.body);
    const id = req.params.id;
    const { comentarios_usuario } = req.body;

    
    if (comentarios_usuario && comentarios_usuario.length > 150) {
      return res.status(400).json({ error: "Comentários excedem 150 caracteres." });
    }

    client.query(
      "UPDATE Usuarios SET comentarios_usuario = $1 WHERE id = $2 AND tmdb_id IS NOT NULL RETURNING id, tmdb_id, titulo, caminho_poster, comentarios_usuario, data_criacao",
      [comentarios_usuario || "", id],
      (err, result) => {
        if (err) {
          console.error("Erro ao executar UPDATE de favorito", err);
          res.status(500).json({ error: "Erro ao atualizar favorito" });
        } else {
          if (result.rowCount == 0) {
            res.status(404).json({ info: "Favorito não encontrado." });
          } else {
            res.status(202).json(result.rows[0]);
            console.log("Favorito atualizado:", result.rows[0]);
          }
        }
      }
    );
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// EXCLUIR UM FAVORITO
app.delete("/favoritos/:id", (req, res) => {
  try {
    console.log("Rota: DELETE /favoritos/" + req.params.id);
    client.query(
      "DELETE FROM Usuarios WHERE id = $1 AND tmdb_id IS NOT NULL",
      [req.params.id],
      (err, result) => {
        if (err) {
          console.error("Erro ao executar DELETE de favorito", err);
          res.status(500).json({ error: "Erro ao deletar favorito" });
        } else {
          if (result.rowCount == 0) {
            res.status(404).json({ info: "Favorito não encontrado." });
          } else {
            res
              .status(200)
              .json({ info: `Favorito excluído. Código: ${req.params.id}` });
            console.log("Favorito excluído. ID:", req.params.id);
          }
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Rota raiz para teste
app.get("/", (req, res) => {
  console.log("Response ok.");
  res.send("Ok – Servidor disponível.");
});

app.listen(config.port, () =>
  console.log("Servidor funcionando na porta " + config.port)
);

module.exports = app;