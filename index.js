const fs = require('fs')
const puppeteer = require('puppeteer')

const link = 'https://www.kino-teatr.ru/kino/acter/w/ros/318942/works/'
let globalArr = []

const actor = async () => {
    try {
        // Puppeteer settings ###
        let browser = await puppeteer.launch({
            headless: true, slowMo: 100, devtools: false
        })
        let page = await browser.newPage()
        await page.setViewport({
            width: 900,
            height: 900
        })

        // All Films ###
        await page.goto(link, {waitUntil: 'domcontentloaded'})
        await page.waitForSelector('div.grid_content.page_content_block')

        let films = await page.evaluate(async () => {
            const container = await document.querySelectorAll('div.film_block')
            let result = []

            container.forEach(film => {
                const filmName = film.querySelector('.film_name') ? film.querySelector('.film_name').innerText : ''
                const filmYear = film.querySelector('.film_year_text') ? film.querySelector('.film_year_text').innerText.replace(/\r?\n/g, '') : ''
                const filmLink = film.querySelector('.film_name > a') ? film.querySelector('.film_name > a').href : ''

                result.push({
                    filmName: filmName,
                    filmYear: filmYear,
                    filmLink: filmLink
                })
            })

            return result
        })

        // Current Film ###
        for (const film of films) {
            await page.goto(film.filmLink, {waitUntil: 'domcontentloaded'})
                .then(() => page.waitForSelector('div.grid_content.page_content_block'))
            await globalArr.push(Object.assign(film, await currentFilm()))
        }

        // Writing to file ###
        await fs.writeFile('kino.json', JSON.stringify(globalArr), (err) => {
            if (err) throw err
            console.log('Saved success...')
        })
        await browser.close()

        // Functions ###
        function currentFilm() {
            return page.evaluate(async () => {
                let internalResult = {},
                    producer = [],
                    screenwriter = [],
                    composer = [],
                    produced

                const container = await document.querySelector('div.grid_content.page_content_block')
                const personBlock = container.querySelectorAll('.film_persons_block')

                personBlock.forEach(item => {
                    const blockType = item.querySelector('.film_persons_type').innerText
                    const blockName = item.querySelector('.film_persons_names').innerText

                    if (blockType === 'Режиссер' || blockType === 'Режиссеры') {
                        producer.push(blockName)
                    } else if (blockType === 'Сценарист' || blockType === 'Сценаристы') {
                        screenwriter.push(blockName)
                    } else if (blockType === 'Композитор' || blockType === 'Композиторы') {
                        composer.push(blockName)
                    } else if (blockType === 'Производство') {
                        produced = blockName
                    }

                    internalResult = {
                        producer: producer,
                        screenwriter: screenwriter,
                        composer: composer,
                        produced: produced
                    }
                    return internalResult
                })
                return internalResult
            })
        }

    } catch (e) {
        console.log(e)
    }
}

actor()
