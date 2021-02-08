const fs = require('fs')
const puppeteer = require('puppeteer')

const link = 'https://www.kino-teatr.ru/kino/acter/w/ros/426855/works/'
let globalArr = []

const actor = async () => {
    // Puppeteer settings ###
    let browser = await puppeteer.launch({
        headless: true, slowMo: 100, devtools: false
    })
    let page = await browser.newPage()
    await page.setViewport({
        width: 900,
        height: 900
    })
    await console.log('Starting parse...')

    // All Films ###
    await page.goto(link, {waitUntil: 'domcontentloaded'})
        .then(() => page.waitForSelector('div.grid_content.page_content_block'))

    let films = await page.evaluate(() => {
        const container = document.querySelectorAll('div.film_block')
        let result = []

        container.forEach(film => {
            const filmName = film.querySelector('.film_name') ? film.querySelector('.film_name').innerText.replace(/\|\|/g, '|') : ''
            const filmYear = film.querySelector('.film_year_text') ? film.querySelector('.film_year_text').innerText.replace(/\r?\n/g, '') : ''
            const filmLink = film.querySelector('.film_name > a') ? film.querySelector('.film_name > a').href : ''
            const filmRole = film.querySelector('.film_role')
            const country = film.querySelector('.film_country')
            let roleType
            let filmCountry

            country ? filmCountry = country.innerText.replace(/\)/, '').replace(/\(/, '') : filmCountry = 'Россия'

            if (filmRole) {
                filmRole.innerText === 'эпизод' ? roleType = '3' : ''
                filmRole.innerText === 'главная' ? roleType = '1' : ''
                filmRole.innerText !== 'главная' && filmRole.innerText !== 'эпизод' && filmRole ? roleType = '2' : ''
            } else {
                roleType = ''
            }

            result.push({
                filmName: filmName,
                filmYear: filmYear,
                filmLink: filmLink,
                filmRole: roleType,
                filmCountry: filmCountry
            })
        })
        return result
    })

    // Current Film ###
    for (const [index, film] of films.entries()) {
        if (film.filmLink.length > 0) {
            await page.goto(film.filmLink, {waitUntil: 'domcontentloaded'})
                .then(() => page.waitForSelector('div.grid_content.page_content_block'))
            let newArr = Object.assign(film, await currentFilm())

            let newObj = await currentFilm()
            await page.goto(newObj.allActorsBtn, {waitUntil: 'domcontentloaded'})
                .then(() => page.waitForSelector('div.grid_content.page_content_block'))

            await globalArr.push(Object.assign(newArr, await actors()))
            await console.log(index, film.filmName)
        }
    }

    // Writing to file ###
    await fs.writeFile('kino.json', JSON.stringify(await clearGlobalArr()), (err) => {
        if (err) throw err
        console.log('Saved success...')
    })
    await browser.close()

    // Functions ###
    function currentFilm() {
        return page.evaluate( () => {
            let internalResult = {},
                producer = [],
                screenwriter = [],
                composer = [],
                type = 'Фильм',
                produced,
                allActorsBtn

            const container = document.querySelector('div.grid_content.page_content_block')
            const personBlock = container.querySelectorAll('.film_persons_block')

            personBlock.forEach(item => {
                const blockType = item.querySelector('.film_persons_type').innerText
                const blockName = item.querySelector('.film_persons_names')

                if (blockType === 'Режиссер' || blockType === 'Режиссеры') {
                    producer.push(blockName.innerText)
                } else if (blockType === 'Сценарист' || blockType === 'Сценаристы') {
                    screenwriter.push(blockName.innerText)
                } else if (blockType === 'Композитор' || blockType === 'Композиторы') {
                    composer.push(blockName.innerText)
                } else if (blockType === 'Производство') {
                    produced = blockName.innerText
                } else if (blockType === 'Cерий') {
                    +blockName.innerText > 4 ? type = 'Сериал' : type = 'Фильм'
                } else if (blockType === 'Актеры') {
                    allActorsBtn = blockName.querySelector('div > a').href
                }

                internalResult = {
                    producer: producer.join(', ').replace(/\s*\(.*\)\s*$/gm, ''),
                    screenwriter: screenwriter.join(', ').replace(/\s*\(.*\)\s*$/gm, ''),
                    composer: composer.join(', ').replace(/\s*\(.*\)\s*$/gm, ''),
                    produced: produced,
                    type: type,
                    allActorsBtn: allActorsBtn
                }
            })

            return internalResult
        })
    }

    function actors() {
        return page.evaluate(() => {
            const container = document.querySelectorAll('div.actor_details')
            let result = {},
                mainActors = []

            container.forEach(actor => {
                const isMain = actor.querySelector('.film_main_role')
                const actorName = actor.querySelector('.film_name strong') ? actor.querySelector('.film_name strong').innerText : ''

                isMain ? mainActors.push(actorName) : ''
                result = {
                    mainActors: mainActors.join(', ').replace(/\s*\(.*\)\s*$/gm, '')
                }
            })
            return result
        })
    }

    function clearGlobalArr() {
        return globalArr.map((item) => {
            delete item.filmLink
            delete item.allActorsBtn

            return item
        })
    }
}

actor()
