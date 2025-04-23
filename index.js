const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

 
app.use(cors({
    origin: ['http://localhost:5173',
        'https://group-study-c2713.web.app',
        'https://group-study-c2713.firebaseapp.com',

    ],
    credentials: true
}));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ieavp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const groupAssignmentCollection = client.db('GroupStudy').collection('Assignments');
        const assignmentTakingCOllection=client.db('GroupStudy').collection('my-assignment')


        app.get('/pending-assignments', async (req, res) => {
            const email = req.query.email; 
        
            const query = {
                status: 'pending',
                applicant_email: { $ne: email } 
            };
        
            const result = await assignmentTakingCOllection.find(query).toArray();
        
            for (const assignment of result) {
                const fullAssignment = await groupAssignmentCollection.findOne({ _id: new ObjectId(assignment.assign_id) });
        
                if (fullAssignment) {
                    assignment.title = fullAssignment.title;
                    assignment.totalMarks = fullAssignment.totalMarks;
                }
            }
        
            res.send(result);
        });
        app.put('/mark-assignment/:id', async (req, res) => {
            const id = req.params.id;
            const { obtainedMarks, feedback } = req.body;
        
            const updateDoc = {
                $set: {
                    obtainedMarks,
                    feedback,
                    status: 'Checked'
                }
            };
        
            const result = await assignmentTakingCOllection.updateOne({ _id: new ObjectId(id) }, updateDoc);
            res.send(result);
        });
        
        

        app.post('/my-assignment', async (req, res) => {
            const application = req.body;
            application.status = application.status || 'pending'; 
            const result = await assignmentTakingCOllection.insertOne(application);
            res.send(result);
        })
        app.get('/my-assignment',async(req,res)=>{
            const email=req.query.email;
            const query={applicant_email:email}
            const result=await assignmentTakingCOllection.find(query).toArray();

            for (const application of result) {
                console.log(application.assign_id)
                const query1 = { _id: new ObjectId(application.assign_id) }
                const assignment = await assignmentTakingCOllection.findOne(query1);
                if(assignment){
                    application.title = assignment.title;
                    application.status = assignment.status;
                   
                   
                   
                }
            }
            res.send(result);
          })
        app.post('/assignment', async (req, res) => {
            const application = req.body;
            const result = await groupAssignmentCollection.insertOne(application);
            res.send(result);
        });

        app.get('/assignment', async (req, res) => {
            const result = await groupAssignmentCollection.find().toArray();
            res.send(result);
        });
        app.get('/assignment/:id', async (req, res) => {
            const id = req.params.id;
          
            if (!ObjectId.isValid(id)) {
              return res.status(400).send({ error: 'Invalid ID format' });
            }
          
            const result = await groupAssignmentCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
          });
          

       
        
        app.delete('/assignment/:id', async (req, res) => {
            const id = req.params.id;
            const email = req.query.email;
            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ error: 'Invalid assignment ID' });
            }
        
            try {
                const assignment = await groupAssignmentCollection.findOne({ _id: new ObjectId(id) });
        
                if (!assignment) {
                    return res.status(404).send({ error: 'Assignment not found' });
                }
        
              
                if (email !== assignment.applicant_email) {
                    return res.status(403).send({ error: 'Unauthorized: You can only delete your own assignments' });
                }
        
                const result = await groupAssignmentCollection.deleteOne({ _id: new ObjectId(id) });
        
                if (result.deletedCount === 0) {
                    return res.status(500).send({ error: 'Failed to delete the assignment' });
                }
        
                res.send({ message: 'Assignment deleted successfully' });
        
            } catch (error) {
                console.error('Delete error:', error);
                res.status(500).send({ error: 'Internal Server Error' });
            }
        });
        
       

        app.put('/assignment/:id', async (req, res) => {
            const id = req.params.id;

            
            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ error: 'Invalid assignment ID format' });
            }

            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: req.body
            };

            try {
                const result = await groupAssignmentCollection.updateOne(filter, updatedDoc, options);
                res.send(result);
            } catch (error) {
                console.error('Update failed:', error);
                res.status(500).send({ error: 'Failed to update assignment' });
            }
        });

       
      

    } finally {
        // Optionally close the client on app termination
    }
}

run().catch(console.error);

app.get('/', (req, res) => {
    res.send('Welcome to Group Assignment Backend');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
