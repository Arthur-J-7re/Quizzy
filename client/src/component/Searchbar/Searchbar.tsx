import './Searchbar.css';
import { Select, MenuItem, InputLabel, FormControl, TextField } from '@mui/material';
import { styled } from '@mui/system';

interface SearchbarProps {   
    filterData: {
        type: string;
        possibleType : {value : string, title : string}[];
        possibleScope : {value : string, title : string}[];
        searchText: string;
        scope: string;
    };
    setFilterData: React.Dispatch<React.SetStateAction<SearchbarProps["filterData"]>>;
};

const CustomMenuItem = styled(MenuItem)(({}) => ({
    /*'&:hover': {
      backgroundColor: '#000000', // Bleu foncé au survol
      color: 'white', // Texte blanc au survol
    },*/
  }));

export function Searchbar ({ filterData, setFilterData }: SearchbarProps) {
    return (
        <div className="Searchbar">
            <div className="filter">
                {/* Menu déroulant pour choisir le type de question */}
                {filterData.possibleType.length > 1 ?
                    <FormControl fullWidth>
                        <InputLabel id="question-type-label">Type de question</InputLabel>
                        <Select
                        labelId="question-type-label"
                        value={filterData.type}
                        onChange={(e) => setFilterData(prev => ({ ...prev, type: e.target.value }))}
                        label="Type de question"
                        >
                        {
                            filterData.possibleType.map(({value, title} : {value : string, title : string}) => 
                                <CustomMenuItem value={value}>{title}</CustomMenuItem>
                            )
                        }
                        </Select>
                    </FormControl>
                 : 
                 ""
                }

                {/* Champ de recherche */}
                <TextField
                    label="Rechercher..."
                    variant="outlined"
                    value={filterData.searchText}
                    onChange={(e) => setFilterData(prev => ({ ...prev, searchText: e.target.value }))}
                    fullWidth
                />

                {/* Choix de la recherche (tags ou énoncé + réponses) */}
                <FormControl fullWidth>
                    <InputLabel id="search-scope-label">Portée de la recherche</InputLabel>
                    <Select
                    labelId="search-scope-label"
                    value={filterData.scope}
                    onChange={(e) => setFilterData(prev => ({ ...prev, scope: e.target.value }))}
                    label="Portée de la recherche"
                    >
                    {
                        filterData.possibleScope.map(({value, title}:{value : string, title : string}) =>
                            <CustomMenuItem value={value}>{title}</CustomMenuItem>
                        )
                    }
                    </Select>
                </FormControl>
                </div>
        </div>
    );
};
