const express = require("express")
const axios = require("axios")
const cheerio = require("cheerio")

const app = express()

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
    //Setting the correct headers is important as amazon blocks you otherwise
    axios.get(`https://www.amazon.com/s/k=${encodeURIComponent(keyword)}`, {
        headers: { 'User-Agent':'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/117.0', 
        'Accept-Language': 'en-US,en;q=0.5' }
      }).then((response)=>{
        const data = response.data
        const search_html = cheerio.load(data)
        const product_elements = search_html("[data-component-type=s-search-result]") //Query search result card elements
        const products = []
        product_elements.each((i, el)=>{
            products.push({ //Match elements inside each card; Most of these have to be matched by their unique css style combinations.
                title: search_html(el).find(".a-size-base-plus").text(), 
                reviews: search_html(el).find("span.a-size-base.s-underline-text").text(),
                //Matches the first <span> tag inside the container for the stars and review counter, which is the one containing the star counter.
                stars: search_html(el).find(".a-row.a-size-small").find("span").first().attr("aria-label").substring(0, 3), //Extract number of stars from "x.x out of 5 stars" alt text using substring
                //Extracts the image URL via the src attribute
                image_url: search_html(el).find(".s-image").attr("src")
            })
        })
        res.json(products); //Return scraped data as JSON
    }).catch((err) =>{
        console.log("Error scraping search results:")
        console.log(err)
        res.status(axios.HttpStatusCode.InternalServerError);
        res.json({"error": "Internal error while scraping search results"})
    }
    ) 
})

app.listen(1337);