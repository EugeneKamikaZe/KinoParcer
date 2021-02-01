const $ = require('jquery')
const fs = require('fs')
const puppeteer = require('puppeteer')

let link = 'https://www.kino-teatr.ru/kino/acter/m/ros/545491/works/'

const actor = async () => {
    try {
        let browser = await puppeteer.launch({
            headless: true, slowMo: 100, devtools: true
        })
        let page = await browser.newPage()
        await page.setViewport({
            width: 900,
            height: 900
        })

    // All Films
        await page.goto(link, {waitUntil: 'domcontentloaded'})
        await page.waitForSelector('div.grid_content.page_content_block')

        let films = await page.evaluate(async () => {
            let result = []
            const container = await document.querySelectorAll('div.film_block')

            let text = Array.from(container)

            text.forEach(item => {
                const films = item.querySelector('.film_name > a') === null ? '' : item.querySelector('.film_name > a')
                const filmLink = films.href

                if (filmLink) {
                    result.push({
                        filmLink,
                    })
                }
            })

            return result
        })

    // Current Film
        const globalArr = []
        const filmPage = async function allFilms() {
            if (films.length > 0) {
                for (const item of films) {
                    console.log(item)
                    await page.goto(item.filmLink, {waitUntil: 'domcontentloaded'})
                    await page.waitForSelector('div.grid_content.page_content_block')

                    let currentFilm = await page.evaluate(async () => {
                        let result = []
                        const container = await document.querySelectorAll('div.film_persons_block')

                        const filmInfo = document.querySelector('div#page_name_line > #page_name > h1').textContent
                        const filmInfoArr = filmInfo.replace(')', '').split(' (')
                        const filmName = {type: 'Название фильма', value: filmInfoArr[0]}
                        const filmDate = {type: 'Дата выпуска', value: filmInfoArr[1]}
                        result.push(filmName, filmDate)

                        let text = Array.from(container)
                        text.forEach(item => {
                            let personTypeObj = {
                                director: 'Режиссер',
                                screenwriter: 'Сценаристы',
                                composer: 'Композитор',
                                produced: 'Производство'
                            }

                            const props = item.querySelector('.film_persons_type')
                            const dataType = props.innerText.trim()
                            const person = props.nextElementSibling.textContent.replace('\n', '')

                            Object.keys(personTypeObj).forEach(key => {
                                if (personTypeObj[key] === dataType) {
                                    result.push({
                                        type: dataType,
                                        value: person
                                    })
                                }
                            })
                        })
                        console.log(result)

                        return result
                    })

                    globalArr.push(currentFilm)

                    await page.goBack()
                }
            }
        }
        await filmPage()

        fs.writeFile('kino.json', JSON.stringify(globalArr), (err) => {
            if (err) throw err
            console.log('Saved success...')
        })

        await browser.close()

    } catch (e) {
        console.log(e)
    }
}

actor()

