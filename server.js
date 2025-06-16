// server.js
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();
const session = require('express-session');
const nodemailer = require('nodemailer');
const app = express();
const port = 3000;


const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});


const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: process.env.EMAIL_SECURE === 'true', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

app.use(session({
    secret: 'chave-secreta-forte-e-aleatoria', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/cadastrar', async (req, res) => {
    const { nome, email, senha } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id',
            [nome, email, senha]
        );
        console.log('Usuário cadastrado com ID:', result.rows[0].id);

        res.redirect('/login.html?cadastro=sucesso');
    } catch (err) {
        console.error('Erro ao cadastrar usuário:', err);

        res.status(500).send('Erro ao cadastrar. Verifique se o e-mail já existe ou tente novamente.');
    }
});

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        const result = await pool.query(
            'SELECT id, nome, email, senha FROM usuarios WHERE email = $1',
            [email]
        );

        if (result.rows.length > 0) {
            const usuario = result.rows[0];

            if (usuario.senha === senha) {
                req.session.user = { id: usuario.id, nome: usuario.nome, email: usuario.email };
                console.log('Login bem-sucedido para:', usuario.email);

                res.redirect('/index.html?login=sucesso');
            } else {
                res.status(401).send('E-mail ou senha inválidos.');
            }
        } else {
            res.status(401).send('E-mail ou senha inválidos.');
        }
    } catch (err) {
        console.error('Erro ao fazer login:', err);
        res.status(500).send('Erro no servidor ao tentar fazer login.');
    }
});

app.get('/auth/status', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Não foi possível fazer logout.' });
        }
        res.clearCookie('connect.sid'); 
        res.json({ success: true, message: 'Logout bem-sucedido.' });
    });
});

app.post('/sugestao', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
    }

    const { name, email, suggestion } = req.body;
    const userFromSession = req.session.user;


    if (email !== userFromSession.email || name !== userFromSession.nome) {
        console.warn("Discrepância nos dados do formulário de sugestão e sessão.");
    }

    const mailOptions = {
        from: `"${userFromSession.nome}" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO, 
        subject: 'Nova Sugestão Recebida - FalaWeb',
        html: `
            <p>Você recebeu uma nova sugestão de <strong>${userFromSession.nome}</strong> (${userFromSession.email}).</p>
            <p><strong>Sugestão:</strong></p>
            <p>${suggestion}</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Sugestão enviada com sucesso!' });
    } catch (error) {
        console.error('Erro ao enviar e-mail de sugestão:', error);
        res.status(500).json({ success: false, message: 'Falha ao enviar sugestão. Tente novamente mais tarde.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
