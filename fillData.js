
const {v1} = require('neo4j-driver');

const driver = v1.driver(
  'bolt://localhost:7687',
  v1.auth.basic('neo4j', 'password')
);

const fillData = false;
if (fillData) {
  const Sequelize = require('sequelize');
  const sequelize = new Sequelize('moviedb', 'cs3423', '', {
    host: "localhost",
    port: 3306,
    dialect: 'mysql',
  });

  sequelize.query(`select * from movie`)
    .then((result) => {
      const session = driver.session();
      const movies = result[0];
      console.log('movies');
      movies.forEach(movie => {
        const {id: movieId, title, year, rating, company} = movie;
        // console.log(title, movieId);
        session.run(
          'create (a:Movie {movieId:$movieId, title:$title, year:$year, rating:$rating, company:$company})',
          {movieId, title, year, rating, company})
        });
      session.close();
    })
    .then(()=>sequelize.query(`select * from actor`))
    .then((result)=>{
      const session = driver.session();
      const actors = result[0];
      console.log('actors');
      actors.forEach(actor=>{
        const {id:actorId, first, last, dob, dod} = actor;
        // console.log(first, last);
        session.run(
          'create (a:Actor {actorId:$actorId, firstName:$first, lastName:$last, dob:$dob, dod:$dod, fullName:$first+" "+$last})',
          {actorId, first, last, dob,dod}
        )
      });
      session.close();
    })
    .then(()=>sequelize.query(`select * from movieactor`))
    .then((result)=>{
     const session = driver.session();
     const movieactors = result[0];
     console.log('acted in');
     movieactors.forEach(movieactor=>{
       const {mid, aid, role} = movieactor;
       // console.log(mid, aid, role);
       session.run(
         'match (m:Movie {movieId:$mid}),(a:Actor {actorId:$aid}) create p=(a)-[:ACTED_IN {role:$role}]->(m)',
         {mid,aid,role}
       );
     });
     session.close();
    })
    .then(()=>sequelize.query(`select * from moviegenre`))
    .then((result)=>{
      const session = driver.session();
      const moviegenres = result[0];
      console.log('genres');
      moviegenres.forEach(moviegenre=>{
        const {mid, genre:name} = moviegenre;
        // console.log(mid,name);
        session.run(
          'merge (g:Genre {name:$name}) return g;',
          {mid,name}
        );

        session.run(
          'match (m:Movie {movieId:$mid}), (g:Genre {name:$name}) merge p=(m)-[:IN_GENRE]->(g)',
          {mid,name}
        );
      });
      session.close();
    })
    .then(() => console.log("Done Loading"));
}
