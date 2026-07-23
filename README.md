## Magic Fight: the app!

Long ago, I made a bunch of dumb character art in Google Drawings.

Equally long ago, I wrote a Python command line game featuring these characters. (Do not ask me about their universe; I will talk your ears off.)

And now there's AI.

So I asked Claude to please use that 'serverless' buzzword we keep seeing all over the place
and convert my original game (and art) into a web app. With, like, fancy JavaScript so everyone can throw polygons at each other.

![Character art](readme_image.png)

### Running locally

**Requirements:** Node.js 18+ (tested on v24)

#### 1. Clone the repo
```bash
git clone <repo-url>
cd magic_fight_app
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Start the dev server
```bash
npm run dev
```

Then open the URL printed in your terminal (usually `http://localhost:5173`). You
can also access the latest live version [here!](https://fialovy.github.io/magic_fight_app/)

