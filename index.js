const express = require('express')
const cors=require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app=express()
const port=process.env.PORT || 5000 ;

//middleware
app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.wcearye.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db('opiniunDB').collection('users')
    const surveyCollection = client.db('opiniunDB').collection('surveys')

    //jwt related api
    app.post('/jwt',async(req,res)=>{
      const user=req.body;
      const token=await jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:"1d"
      })
      res.send({token})
    })
    
    //midlewares
    const verifyToken=(req,res,next)=>{
       if(!req.headers.authorization){
         return res.status(401).send({message:'unathorized access'})
       }

       const token = req.headers.authorization.split(" ")[1]
       jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
          if(err){
            return res.status(401).send({message:'unathorized access'})
          }
          req.decoded=decoded;
          next();
       })
    }

    //use verify admin after verify token
    const verifyAdmin=async(req,res,next)=>{
      const email=req.decoded?.email
      const query={email:email}
      const user=await userCollection.findOne(query)
      const isAdmin =user?.role==="admin"
      if(!isAdmin){
         return res.status(403).send({message:"forbidden access"})
      }
      next();
    }

    
    //user related api
    app.get('/users',async(req,res)=>{
      const result= await userCollection.find().toArray()
      res.send(result)
    })

    app.get('/users/admin/:email',async(req,res)=>{
        const email=req.params.email;
        //todo:verify user by using token
        const query={email:email}
        const user=await userCollection.findOne(query)
        let admin=false;
        if(user){
          admin = user?.role === "admin"
        }
        res.send({admin})
    })

    app.get('/users/surveyor/:email',async(req,res)=>{
       const email = req.params.email
       //todo : verify user by using token
       const query={ email : email }
       const user=await userCollection.findOne(query)
       let surveyor=false;
       if(user){
         surveyor=user?.role === "surveyor"
       }
       res.send({surveyor})
    })

    app.post('/users',async(req,res)=>{
       const user=req.body;
       const query={email:user?.email}
       const existingUser= await userCollection.findOne(query)
       if(existingUser){
          return res.send({message:'User already exist',insertedId:null})
       }
       const result=await userCollection.insertOne(user)
       res.send(result)
    })
    
    app.patch('/users/admin/:id',async(req,res)=>{
       const id=req.params.id;
       const filter={_id : new ObjectId(id)}
       const updatedDoc={
          $set:{
            role:"admin"
          }
       }
       const result=await userCollection.updateOne(filter,updatedDoc)
       res.send(result)
    })

    app.patch('/users/surveyor/:id',async(req,res)=>{
       const id=req.params.id;
       const filter={_id : new ObjectId(id) }
       const updateDoc={
         $set:{
           role:"surveyor"
         }
       }
       const result=await userCollection.updateOne(filter,updateDoc)
       res.send(result)
    })
    

    app.delete('/users/:id',async(req,res)=>{
       const id=req.params.id;
       const query={_id : new ObjectId(id)}
       const result = await userCollection.deleteOne(query)
       res.send(result)
    })

    //survey related api
    app.get('/surveys',async(req,res)=>{
       const result=await surveyCollection.find().toArray()
       res.send(result)
    })

    app.get('/surveys/:id',async(req,res)=>{
       const id=req.params.id;
       const query={_id : new ObjectId(id)}
       const result = await surveyCollection.findOne(query)
       res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send("Opiniun is running successfully")
})

app.listen(port,()=>{
    console.log(`Opiniun is listening On port: ${port}`)
})