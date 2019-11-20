const typeDefs = `
type Actor {
  actorId: Int
  firstName: String
  lastName: String
  fullName: String
  dob: String
  dod: String
  actedIn: [ActedIn]
}
type Movie {
    movieId: Int
    title: String
    year: Int
    genres: [Genre] @relation(name: "IN_GENRE", direction: "OUT")
    reviews: [Review]
    userRating: Float @cypher (statement:"""
    match p=()-[r:REVIEWED]->(this) return round(100*avg(r.rating))/100 as value;
    """)
    actors: [ActedIn]
}
type Genre {
    name: String
    movies: [Movie] @relation(name: "IN_GENRE", direction: "IN")
}
type User {
    name: String
    reviews: [Review]
}
type Review @relation(name:"REVIEWED") {
    from: User
    to: Movie
    comment: String
    rating: Int
}
type ActedIn @relation(name:"ACTED_IN"){
  from: Actor
  to: Movie
  role: String
}
type Ticket {
    ticketID: Int
    movie: Movie @relation(name: "FOR", direction: "OUT")
}
type Order @relation(name: "ORDERED") {
    from: User
    to: Ticket
}
type MovieTime {
  movie: Movie
  time: String
  location: String
}
type Query {
  getMovies: [MovieTime]
}
`;

const Sequelize = require('sequelize');
const sequelize = new Sequelize('ticketsystem', 'root', 'password', {
  host: "localhost",
  port: 3306,
  dialect: 'mysql',
});

const {makeAugmentedSchema} = require('neo4j-graphql-js');

const {v1} = require('neo4j-driver');

const driver = v1.driver(
  'bolt://localhost:7687',
  v1.auth.basic('neo4j', 'password')
);

const resolvers = {
  Query: {
    getMovies: () => {
      return new Promise((resolve) => {
        const newMovieTimes = [];
        sequelize.query('select * from movietimes')
          .then((result) => {
            return Promise.all(result[0].map(movieTime => {
                return new Promise((resolve) => {
                  const session = driver.session();
                  session.run('match (m:Movie {movieId:$movieId}) return m;', {movieId: movieTime.movieId})
                    .then((result) => result.records[0]._fields[0].properties)
                    .then((movie) => newMovieTimes.push({time: movieTime.movieTime, movie, location: "AMC Statesboro"}))
                    .then(() => session.close())
                    .then(() => resolve());
                })
              })
            );
          })
          .then(() => {
            return new Promise((resolve) => {
              newMovieTimes.sort((m1, m2) => m1.time > m2.time);
              resolve()
            })
          })
          .then(() => {
            resolve(newMovieTimes)
          });
      })
    }
  }
};

const schema = makeAugmentedSchema({
  typeDefs, config: {
    query: {
      exclude: ["MovieTime"]
    },
    debug: true
  },
  resolvers,
});


const {ApolloServer} = require('apollo-server');

const server = new ApolloServer({schema, context: {driver}});

server.listen(3003, '0.0.0.0').then(({url}) => {
  console.log(`GraphQL API ready at ${url}`);
});
