<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nouvelle messe</title>
    <!-- CSS -->
    <link href="index.css" rel="stylesheet">
    <!-- JS -->
    <script src="../../components/jquery/jquery-latest.js"></script>
    <script src="../../components/jquery/jquery.js"></script>
    <script src="index.js"></script>
    <script src="../../components/autocomplete/autocomplete.js"></script>
    <script src="../../components/program/program.js"></script>
</head>

<body>

    <?php
        if(isset($_GET['programme']) && str_contains(trim($_GET['programme']), "/pdf/")) {
            $programme = (String) trim($_GET['programme']);
        } else {
            $programme = "";
        }
    ?>

    <div class="demo-page">
        <div class="demo-page-navigation">
            <nav>
                <ul>
                    <!--<li>
                        <a href="#installation">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-tool">
                                <path
                                    d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                            </svg>
                            Paramètres</a>
                    </li>-->
                    <li>
                        <a href="#informations" id="informations_part">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-calendar">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            Informations</a>
                    </li>
                    <li id="description_list">
                        <a href="#description_link">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-align-justify">
                                <line x1="21" y1="10" x2="3" y2="10" />
                                <line x1="21" y1="6" x2="3" y2="6" />
                                <line x1="21" y1="14" x2="3" y2="14" />
                                <line x1="21" y1="18" x2="3" y2="18" />
                            </svg>
                            Description</a>
                    </li>
                    <!--<li>
                        <a href="#checkbox-and-radio">
                            <img src="/components/icons/double_note.svg" style="height: 1.25em;width: 1.25em;margin-right: 1em;">
                            Entrée</a>
                    </li>-->
                    <!--<li>
                        <a href="#fieldset">
                            <svg xmlns="http://www.w3.org/2000/svg" style="transform: rotate(90deg)" width="24"
                                height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round" class="feather feather-columns">
                                <path
                                    d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18" />
                            </svg>
                            Kyrié</a>
                    </li>

                    <li>
                        <a href="#icons">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-feather">
                                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
                                <line x1="16" y1="8" x2="2" y2="22" />
                                <line x1="17.5" y1="15" x2="9" y2="15" />
                            </svg>
                            Gloria</a>
                    </li>
                    <li>
                        <a href="#validation">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-alert-triangle">
                                <path
                                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            Psaume</a>
                    </li>
                    <li>
                        <a href="#date">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-calendar">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            Date input</a>
                    </li>
                    <li>
                        <a href="#other">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-server">
                                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                                <line x1="6" y1="6" x2="6.01" y2="6" />
                                <line x1="6" y1="18" x2="6.01" y2="18" />
                            </svg>
                            Other input types</a>
                    </li>
                    <li>
                        <a href="#reset">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-power">
                                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                                <line x1="12" y1="2" x2="12" y2="12" />
                            </svg>
                            Reset only</a>
                    </li>
                    <li>
                        <a href="#customization">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-sliders">
                                <line x1="4" y1="21" x2="4" y2="14" />
                                <line x1="4" y1="10" x2="4" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12" y2="3" />
                                <line x1="20" y1="21" x2="20" y2="16" />
                                <line x1="20" y1="12" x2="20" y2="3" />
                                <line x1="1" y1="14" x2="7" y2="14" />
                                <line x1="9" y1="8" x2="15" y2="8" />
                                <line x1="17" y1="16" x2="23" y2="16" />
                            </svg>
                            Customization</a>
                    </li>-->
                    <li>
                        <a href="#end">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-check-square">
                                <polyline points="9 11 12 14 22 4" />
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                            </svg>
                            Fin</a>
                    </li>
                </ul>
            </nav>
        </div>
        <main class="demo-page-content">
            <section id="title_section">
                <div class="href-target" id="intro"></div>
                <h1 class="package-name">Création d'une nouvelle messe</h1>
                <p>
                    Ce formulaire permet de vous aider à créer facilement des messes 😄.
                </p>
                <p>
                    Commencez par remplir la partie informations et continuer ensuite vers les autres catégories. Enfin,
                    sauvegardez.
                </p>
                <p>
                    Pour avoir l'ensemble des partitions, aller à <a href="/explorer/" target="_blank">l'explorateur</a>.
                </p>
            </section>

            <!--<section>
                <div class="href-target" id="installation"></div>
                <h1>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="feather feather-tool">
                        <path
                            d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    Paramètres
                </h1>
                <p>
                    https://freefrontend.com/css-forms/
                    https://github.com/nielsVoogt/nice-forms.css
                    https://codepen.io/NielsVoogt/pen/eYBQpPR
                </p>
            </section>-->

            <section id="section_informations">
                <div class="href-target" id="informations"></div>
                <h1>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="feather feather-calendar">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Informations
                </h1>
                <p>
                    Les informations que vous aller renseigner sont nécessaires pour la suite. Elles permettent de
                    classer la messe au bonne endroit afin de pouvoir la partager.
                </p>

                <div class="nice-form-group">
                    <label>Date</label>
                    <input type="date" id="programme_date"/>
                </div>

                <div class="nice-form-group" style="margin-top:15px">
                    <label>Paroisse</label>
                    <small>Si votre paroisse n'apparaît pas, aller la créer sur la page de gestion des messes.</small>
                    <select id="select_paroisse">
                    </select>
                </div>

                <div class="nice-form-group" style="margin-top:15px">
                    <label>Lieu de la messe</label>
                    <input type="text" placeholder="Ville" id="programme_lieu"/>
                </div>

                <div class="nice-form-group" style="margin-top:15px">
                    <label>Pour quelle occasion cette messe est-elle célébrée ?</label>
                    <small>Messe ordinaire, Messe de semaine, Noël, communion, mariage ...</small>
                    <input type="text" placeholder="Occasion" id="programme_occasion"/>
                </div>

                <fieldset class="nice-form-group">
                    <div class="nice-form-group">
                        <input type="checkbox" id="check-3" class="switch" />
                        <label for="check-3">Messe de semaine<small>Retire des parties (comme le Gloire à
                                Dieu)</small></label>
                    </div>

                    <div class="nice-form-group">
                        <input type="checkbox" id="check-4" class="switch" />
                        <label for="check-4">
                            Messe exceptionnelle
                            <small>Ajoute d'autres parties</small>
                        </label>
                    </div>
                </fieldset>

                <div class="nice-form-group" style="margin-top:15px">
                    <label>Template</label>
                    <small>Base de fichiers pour démarrer (se trouvent dans programmes/Templates).</small>
                    <select id="select_template">
                    </select>
                </div>
            </section>

            <section id="description">
                <div class="href-target" id="description_link"></div>
                <h1>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="feather feather-align-justify">
                        <line x1="21" y1="10" x2="3" y2="10" />
                        <line x1="21" y1="6" x2="3" y2="6" />
                        <line x1="21" y1="14" x2="3" y2="14" />
                        <line x1="21" y1="18" x2="3" y2="18" />
                    </svg>
                    Description
                </h1>

                <p>Si vous avez des informations complémentaire à ajouter pour cette messe.</p>

                <div class="nice-form-group">
                    <label>Description :</label>
                    <textarea rows="5" placeholder="Your message" id="programme_description"></textarea>
                </div>


                <details>
                    <summary>
                        <div class="toggle-code">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-code">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                            Ajouter une partie ci-dessous
                        </div>
                    </summary>
                </details>
            </section>

            <!--<section>   EXEMPLE
                <div class="href-target" id="checkbox-and-radio"></div>
                <div id="" onclick="" ondblclick="">
                    <div class="row">
                        <div class="column"><h1>
                            <div class="row"><div class="column"><img src="/components/icons/double_note.svg" style="height:1.4em">
                        </h1></div>
                        <div class="column part-column"><h1>
                            Entrée
                        </h1></div>
                        <div class="column"><img src="/components/icons/edit.png"
                                style="height:1.2em;right:0px;margin-right:16px" onclick=""></div>
                        <div class="column"><img src="/components/icons/delete.png"
                                style="height:1.2em;right:0px;margin-right:8px" onclick=""></div>
                        <div class="column" style="margin-left:10px"><img src="/components/icons/up-arrow.png"
                                style="height:1.2em;right:0px;margin-right:8px" ontouchstart=""></div>
                        <div class="column" style="margin-left:10px"><img src="/components/icons/down-arrow.png"
                                style="height:1.2em;right:0px;margin-right:8px" ontouchstart=""></div>
                    </div>
                </div>

                <div class="nice-form-group">
                    <h1>Nom du chant</h1>
                    <label>Url du chant</label>
                    <input type="url" placeholder="/type/chant... (ex: /cantique/chantez avec moi/)" value="" id="dName"
                        class="icon-left" />

                    <script>
                        ac.attach({
                            target: document.getElementById("dName"),
                            data: "../../components/autocomplete/autocomplete_path.php"
                        });
                    </script>
                </div>

                
                <details>
                    <summary>
                        <div class="toggle-code">
                            + Ajouter un chant en plus
                        </div>
                        <div class="toggle-code">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-code">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                            Ajouter une partie ci-dessous
                        </div>
                    </summary>
                </details>
            </section>-->

            <!--<section>
                <div class="href-target" id="fieldset"></div>
                <h1>
                    <svg xmlns="http://www.w3.org/2000/svg" style="transform: rotate(90deg)" width="24" height="24"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round" class="feather feather-columns">
                        <path
                            d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18" />
                    </svg>
                    Fieldset
                </h1>
                <p>
                    The <code>fieldset</code> is used to group multiple related input
                    fields. All nested <code>.nice-form-group</code> elements within
                    will automaticly have a smaller margin.
                </p>

                <fieldset class="nice-form-group">
                    <legend>Select your favorite framework</legend>
                    <div class="nice-form-group">
                        <input type="radio" name="radio" id="react" />
                        <label for="react">React</label>
                    </div>

                    <div class="nice-form-group">
                        <input type="radio" name="radio" id="vue" />
                        <label for="vue">Vue</label>
                    </div>

                    <div class="nice-form-group">
                        <input type="radio" name="radio" id="angular" />
                        <label for="angular">Angular</label>
                    </div>
                </fieldset>

                <fieldset class="nice-form-group">
                    <legend>Select your favorite languages</legend>
                    <div class="nice-form-group">
                        <input type="checkbox" id="css" />
                        <label for="css">CSS</label>
                    </div>

                    <div class="nice-form-group">
                        <input type="checkbox" id="html" />
                        <label for="html">HTML</label>
                    </div>

                    <div class="nice-form-group">
                        <input type="checkbox" id="js" />
                        <label for="js">Javascript</label>
                    </div>
                </fieldset>
                <details>
                    <summary>
                        <div class="toggle-code">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-code">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                            Toggle code
                        </div>
                    </summary>
                </details>
            </section>

            <section>
                <div class="href-target" id="icons"></div>
                <h1>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="feather feather-feather">
                        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
                        <line x1="16" y1="8" x2="2" y2="22" />
                        <line x1="17.5" y1="15" x2="9" y2="15" />
                    </svg>
                    Icons
                </h1>
                <p>
                    For some input types it could make sense to show a icon. These icons
                    are hidden by default but can be added by adding either
                    <code>.icon-left</code> or <code>.icon-right</code> to the input
                    element. The icons used are from
                    <a href="https://feathericons.com/" target="_blank">feathericons</a>.
                </p>

                <div class="nice-form-group">
                    <label>Phonenumber</label>
                    <input type="tel" placeholder="Your phonenumber" value="" class="icon-left" />
                </div>

                <div class="nice-form-group">
                    <label>Url</label>
                    <input type="url" placeholder="www.google.com" value="" class="icon-left" />
                </div>

                <div class="nice-form-group">
                    <label>Email</label>
                    <input type="email" placeholder="Your email" value="" class="icon-left" />
                </div>

                <div class="nice-form-group">
                    <label>Password</label>
                    <input type="password" placeholder="Your password" class="icon-left" />
                </div>

                <div class="nice-form-group">
                    <label>Phonenumber</label>
                    <input type="tel" placeholder="Your phonenumber" value="" class="icon-right" />
                </div>

                <div class="nice-form-group">
                    <label>Url</label>
                    <input type="url" placeholder="www.google.com" value="" class="icon-right" />
                </div>

                <div class="nice-form-group">
                    <label>Email</label>
                    <input type="email" placeholder="Your email" value="" class="icon-right" />
                </div>

                <div class="nice-form-group">
                    <label>Password</label>
                    <input type="password" placeholder="Your password" class="icon-right" />
                </div>

                <details>
                    <summary>
                        <div class="toggle-code">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-code">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                            Toggle code
                        </div>
                    </summary>
                </details>
            </section>

            <section>
                <div class="href-target" id="validation"></div>
                <h1>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="feather feather-alert-triangle">
                        <path
                            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Field Validation
                </h1>
                <p>
                    Fields that have a <code>required</code> attribute can be valid or
                    invalid based on their value. When a user focuses on a invalid field
                    the styling is set back to default.
                </p>

                <div class="nice-form-group">
                    <label>Email</label>
                    <input type="email" placeholder="Your email" value="this is not a email adress" required />
                </div>

                <div class="nice-form-group">
                    <label>Email</label>
                    <input type="email" placeholder="Your email" value="nice@forms.com" required />
                </div>
                <details>
                    <summary>
                        <div class="toggle-code">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-code">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                            Toggle code
                        </div>
                    </summary>
                </details>
            </section>

            <section>
                <div class="href-target" id="date"></div>
                <h1>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="feather feather-calendar">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Date input
                </h1>
                <p>
                    Date fields show icons by default. The <code>month</code>,
                    <code>week</code> and <code>date</code> fields have a fixed min
                    width set at 14em. <code>time</code> is set at 7em.
                </p>

                <div class="nice-form-group">
                    <label>Month</label>
                    <input type="month" value="2018-05" />
                </div>

                <div class="nice-form-group">
                    <label>Week</label>
                    <input type="week" value="2017-W01" />
                </div>

                <div class="nice-form-group">
                    <label>Date</label>
                    <input type="date" value="2018-07-22" />
                </div>

                <div class="nice-form-group">
                    <label>Time</label>
                    <input type="time" value="13:30" />
                </div>

                <details>
                    <summary>
                        <div class="toggle-code">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-code">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                            Toggle code
                        </div>
                    </summary>
                </details>
            </section>

            <section>
                <div class="href-target" id="other"></div>
                <h1>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="feather feather-server">
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                        <line x1="6" y1="6" x2="6.01" y2="6" />
                        <line x1="6" y1="18" x2="6.01" y2="18" />
                    </svg>
                    Other input types
                </h1>

                <div class="nice-form-group">
                    <label>Textarea</label>
                    <textarea rows="5" placeholder="Your message"></textarea>
                </div>

                <div class="nice-form-group">
                    <label>Select</label>
                    <select>
                        <option>Please select a value</option>
                        <option>Option 1</option>
                        <option>Option 2</option>
                    </select>
                </div>

                <div class="nice-form-group">
                    <label>File upload</label>
                    <input type="file" />
                </div>

                <div class="nice-form-group">
                    <label>Range slider</label>
                    <input type="range" min="0" max="15" />
                </div>

                <div class="nice-form-group">
                    <label>Number</label>
                    <input type="number" placeholder="1234" />
                </div>

                <div class="nice-form-group">
                    <label>Color</label>
                    <input type="color" />
                </div>

                <details>
                    <summary>
                        <div class="toggle-code">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="feather feather-code">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                            Toggle code
                        </div>
                    </summary>
                </details>
            </section>

            <section>
                <div class="href-target" id="reset"></div>
                <h1>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="feather feather-power">
                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                        <line x1="12" y1="2" x2="12" y2="12" />
                    </svg>
                    Reset only
                </h1>
                <p>There is also a reset only version available, this version provides styled form fields out of the box
                    without any wrapping class. This does however mean that <code>.icon-left</code>,
                    <code>.icon-right</code> or <code>.switch</code> are not included.
                </p>
                <p>
                    Grab the raw CSS <a
                        href="https://raw.githubusercontent.com/nielsVoogt/nice-forms.css/main/dist/nice-forms-reset.css">here</a>,
                    or import the reset from <strong>unpkg</strong> via
                    <code>https://unpkg.com/nice-forms.css@0.1.7/dist/nice-forms-reset.css</code>
                </p>

                <a href="https://nielsvoogt.github.io/nice-forms.css/reset.html" class="to-reset" target="_blank">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="feather feather-external-link">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Check out the example page
                </a>
            </section>

            <section>
                <div class="href-target" id="customization"></div>
                <h1>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="feather feather-sliders">
                        <line x1="4" y1="21" x2="4" y2="14" />
                        <line x1="4" y1="10" x2="4" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12" y2="3" />
                        <line x1="20" y1="21" x2="20" y2="16" />
                        <line x1="20" y1="12" x2="20" y2="3" />
                        <line x1="1" y1="14" x2="7" y2="14" />
                        <line x1="9" y1="8" x2="15" y2="8" />
                        <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                    Customization
                </h1>
                <p>The styling is highly customizable using css variables.</p>
            </section>-->

            <section>
                <div class="href-target" id="end"></div>
                <h1>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="feather feather-check-square">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    Fin
                </h1>
                <p>
                    <!--Vous pouvez également continuer à enrichir cette messe sur la page ... après avoir enregistré.-->
                </p>

                <a onclick=enregistrer() class="to-repo">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="feather feather-external-link">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Enregistrer
                </a>
            </section>

            <!--<footer>Made for you ♥</footer>-->
        </main>
    </div>

    <script>
        let currentStep = 0;
        const steps = document.querySelectorAll(".step");
        const prevBtn = document.getElementById("prevBtn");
        const nextBtn = document.getElementById("nextBtn");

        function changeStep(stepChange) {
            steps[currentStep].classList.remove("active");
            currentStep += stepChange;
            steps[currentStep].classList.add("active");

            prevBtn.disabled = currentStep === 0;
            nextBtn.innerText = currentStep === steps.length - 1 ? "Terminer" : "Suivant";
        }

        // init :
        initProgram("http://localhost/pdf/programmes/Lazare Nantes/2024-06-19_Nantes_Semaine.json",initFormulaire);

        $.ajax({
            type: 'GET',
            url: window.location.origin + '/php/programme/interface.php?action=get_list_paroisses',
            crossDomain: true,
            contentType: "application/x-www-form-urlencoded;charset=ISO-8859-15",
            success: function(data){
                console.log("fichiers : " + data);
               var option_html = "<option>choisissez votre paroisse</option>";
                var paroisses = data.split("Â£");
                for(var i=0; i<paroisses.length-1; i++) {
                    option_html += "<option>" + paroisses[i] + "</option>";
                }
                document.getElementById("select_paroisse").innerHTML = option_html;
            }
        });

        $.ajax({
            type: 'GET',
            url: window.location.origin + '/php/programme/interface.php?action=get_list_templates',
            crossDomain: true,
            contentType: "application/x-www-form-urlencoded;charset=ISO-8859-15",
            success: function(data){
                console.log("fichiers : " + data);
               var option_html = "<option>Ne pas utiliser de template</option>";
                var template = data.split("Â£");
                for(var i=0; i<template.length-1; i++) {
                    option_html += "<option>" + template[i] + "</option>";
                }
                document.getElementById("select_template").innerHTML = option_html;
            }
        });
    </script>
</body>

</html>