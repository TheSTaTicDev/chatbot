const express = require('express');
const https = require('https');
const { HfInference } = require('@huggingface/inference');

const app = express();
const port = process.env.PORT || 3000;

const hfInference = new HfInference("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");

app.use(express.json()); // Middleware to parse JSON payloads

app.post('/get-role', async (req, res) => {
    const { userEmail, message } = req.body;
    console.log(`Received request - userEmail: ${userEmail}, message: ${message}`);

    if (!userEmail || !message) {
        console.error('Invalid request payload: Missing userEmail or message');
        return res.status(400).json({ error: 'Invalid request payload' });
    }

    if (message.toLowerCase().includes('role')) {
        console.log('Fetching role from APEX API');
        
        // Replace with your role-fetching logic
        const role = 'Student'; // This is a placeholder

        const prompt = `The role of the user with email ${userEmail} is: ${role}`;
        res.json({ response: prompt });

    } else {
        const defaultMessage = 'This chatbot only responds to queries about your role.';
        console.log('Non-role query received:', message);
        res.json({ response: defaultMessage });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
