const express = require('express');
const axios = require('axios');
const { InferenceSession } = require('@huggingface/inference');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const model = new InferenceSession({
    model: 'microsoft/DialoGPT-medium'
});

app.post('/get-role', async (req, res) => {
    const { userEmail, message } = req.body;

    if (message.toLowerCase().includes('my role')) {
        console.log('Fetching role from APEX API');
        try {
            const apexApiUrl = `https://apex.oracle.com/pls/apex/new_api/user_roles/user/${userEmail}`;
            const response = await axios.get(apexApiUrl);
            const roleData = response.data;
            const role = roleData.role;

            const prompt = `User with email ${userEmail} is asking: ${message}. The role is: ${role}`;

            const chatResponse = await model.run({
                inputs: prompt
            });

            const friendlyMessage = chatResponse.text.trim();
            res.json({ response: friendlyMessage });
        } catch (error) {
            console.error('Error fetching role or generating response:', error.message);
            res.status(500).json({ error: 'Failed to fetch role or generate response' });
        }
    } else {
        res.json({ response: 'This chatbot only responds to queries about your role.' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
