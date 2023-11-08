const express = require("express")
const axios = require("axios")
const cheerio = require("cheerio")
const userAgents = require("user-agents")
const UserAgent = require("user-agents")

const app = express()

const userAgent = new UserAgent({ deviceCategory: 'desktop' }); //Generate a random user agent to bypass anti-scraping measures.

console.log("UA : " + userAgent.toString())

app.get('/app/scrape', (req, res) => {
    const keyword = req.query.keyword; //Extract keyword from query params.

    //Error out if keyword is undefined
    if(keyword === undefined){
        res.status(axios.HttpStatusCode.BadRequest)
        res.json({"error": "Missing query param keyword"})
        return;
    }

    //Query the amazon search page with keyword.
    //Use encodeURIComponent to prevent slashes and such from polluting the amazon URL.

    axios.get(`https://www.amazon.com/s/k=${encodeURIComponent(keyword)}`, {
        headers: { 'User-Agent':userAgent.toString() }
      }).then((response)=>{
        const data = response.data //Get html from search page
        const search_html = cheerio.load(data)
        const product_elements = search_html("[data-component-type=s-search-result]") //Query search result card elements
        const products = []
        product_elements.each((i, el)=>{
            
            var star_count = ""
            var stars_aria = search_html(el).find(".a-row.a-size-small").find("span").first().attr("aria-label");
            if (stars_aria){
                star_count = stars_aria.substring(0, 3); //Firefox
            }
            else {
                star_count = search_html(el).find("span.a-icon-alt").text().substring(0,3) //Everything else
            }

            //Handle browser differences for rating display;

            products.push({ //Match elements inside each card; Most of these have to be matched by their unique css style combinations.
                title: search_html(el).find(".a-color-base.a-text-normal").text(), 
                reviews: search_html(el).find("span.a-size-base.s-underline-text").text(),
                //Matches the first <span> tag inside the container for the stars and review counter, which is the one containing the star counter.
                stars: star_count, 
                //Extracts the image URL via the src attribute
                image_url: search_html(el).find(".s-image").attr("src")
            })
        })
        res.setHeader("Access-Control-Allow-Origin", "*") //Allow cross origin requests
        res.json(products);
        //Return scraped data as JSON
    }).catch((err) =>{
        console.log("Error scraping search results:")
        console.log(err)
        res.status(axios.HttpStatusCode.InternalServerError);
        res.json({"error": "Internal error while scraping search results"})
    }
    ) 
})

app.listen(1337);